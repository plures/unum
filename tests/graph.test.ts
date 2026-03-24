/**
 * Tests for useGraph() — Svelte 5 runes-compatible reactive graph bindings.
 *
 * Coverage:
 *  - Node CRUD (addNode, updateNode, removeNode)
 *  - Edge CRUD (addEdge, updateEdge, removeEdge)
 *  - Removing a node cascades to incident edges
 *  - Svelte store protocol (subscribe / unsubscribe)
 *  - graph.query() — derived reactive queries with store protocol
 *  - graph.findPath() — BFS shortest-path between nodes
 *  - TypeScript generics compile without errors (smoke test)
 *  - destroy() tears down all subscriptions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, destroyDb } from '../src/context';
import { createMemoryAdapter } from '../src/adapters/memory';
import { useGraph } from '../src/graph';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function setup() {
  initDb(createMemoryAdapter());
}
function teardown() {
  destroyDb();
}

// ---------------------------------------------------------------------------
// node mutations
// ---------------------------------------------------------------------------

describe('useGraph — node mutations', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('starts with an empty graph', () => {
    const graph = useGraph('g');
    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    graph.destroy();
  });

  it('addNode() inserts a node and returns its id', () => {
    const graph = useGraph<{ label: string }>('g');
    const id = graph.addNode({ label: 'A' });
    expect(typeof id).toBe('string');
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].id).toBe(id);
    expect(graph.nodes[0].data.label).toBe('A');
    graph.destroy();
  });

  it('addNode() honours a provided id', () => {
    const graph = useGraph<{ label: string }>('g');
    const id = graph.addNode({ id: 'n1', label: 'First' });
    expect(id).toBe('n1');
    expect(graph.nodes[0].id).toBe('n1');
    graph.destroy();
  });

  it('updateNode() merges data into an existing node', () => {
    const graph = useGraph<{ label: string; active?: boolean }>('g');
    graph.addNode({ id: 'n1', label: 'A' });
    graph.updateNode('n1', { active: true });
    const node = graph.nodes.find(n => n.id === 'n1')!;
    expect(node.data.label).toBe('A');
    expect(node.data.active).toBe(true);
    graph.destroy();
  });

  it('updateNode() on unknown id is a no-op', () => {
    const graph = useGraph('g');
    expect(() => graph.updateNode('nope', { x: 1 })).not.toThrow();
    graph.destroy();
  });

  it('removeNode() deletes the node', () => {
    const graph = useGraph('g');
    graph.addNode({ id: 'n1' });
    graph.removeNode('n1');
    expect(graph.nodes).toHaveLength(0);
    graph.destroy();
  });

  it('removeNode() cascades to incident edges', () => {
    const graph = useGraph('g');
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    graph.addNode({ id: 'c' });
    graph.addEdge('a', 'b');
    graph.addEdge('b', 'c');
    graph.addEdge('a', 'c');

    expect(graph.edges).toHaveLength(3);

    graph.removeNode('b'); // removes a→b and b→c, keeps a→c
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].source).toBe('a');
    expect(graph.edges[0].target).toBe('c');
    graph.destroy();
  });
});

// ---------------------------------------------------------------------------
// edge mutations
// ---------------------------------------------------------------------------

describe('useGraph — edge mutations', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('addEdge() inserts a directed edge and returns its id', () => {
    const graph = useGraph('g');
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    const eid = graph.addEdge('a', 'b');
    expect(typeof eid).toBe('string');
    expect(graph.edges).toHaveLength(1);
    const edge = graph.edges[0];
    expect(edge.source).toBe('a');
    expect(edge.target).toBe('b');
    graph.destroy();
  });

  it('addEdge() stores optional edge data', () => {
    const graph = useGraph<Record<string, never>, { weight: number }>('g');
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    graph.addEdge('a', 'b', { weight: 5 });
    expect(graph.edges[0].data.weight).toBe(5);
    graph.destroy();
  });

  it('updateEdge() merges data into an existing edge', () => {
    const graph = useGraph<Record<string, never>, { weight: number; label?: string }>('g');
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    const eid = graph.addEdge('a', 'b', { weight: 1 });
    graph.updateEdge(eid, { label: 'heavy', weight: 10 });
    const edge = graph.edges.find(e => e.id === eid)!;
    expect(edge.data.weight).toBe(10);
    expect(edge.data.label).toBe('heavy');
    graph.destroy();
  });

  it('updateEdge() on unknown id is a no-op', () => {
    const graph = useGraph('g');
    expect(() => graph.updateEdge('nope', { x: 1 })).not.toThrow();
    graph.destroy();
  });

  it('removeEdge() deletes the edge', () => {
    const graph = useGraph('g');
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    const eid = graph.addEdge('a', 'b');
    graph.removeEdge(eid);
    expect(graph.edges).toHaveLength(0);
    graph.destroy();
  });
});

// ---------------------------------------------------------------------------
// Svelte store protocol
// ---------------------------------------------------------------------------

describe('useGraph — subscribe (Svelte store protocol)', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('subscribe() fires immediately with current state', () => {
    const graph = useGraph('g');
    let received: any = null;
    const unsub = graph.subscribe(s => { received = s; });
    expect(received).toBeDefined();
    expect(received.nodes).toBeDefined();
    expect(received.edges).toBeDefined();
    unsub();
    graph.destroy();
  });

  it('subscribe() fires on node addition', () => {
    const graph = useGraph('g');
    const snapshots: any[] = [];
    const unsub = graph.subscribe(s => snapshots.push(s));
    graph.addNode({ id: 'n1', label: 'X' });
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(snapshots[snapshots.length - 1].nodes)).toContain('n1');
    unsub();
    graph.destroy();
  });

  it('subscribe() does NOT fire after unsubscribe', () => {
    const graph = useGraph('g');
    let count = 0;
    const unsub = graph.subscribe(() => count++);
    expect(count).toBe(1); // immediate call
    unsub();
    graph.addNode({ id: 'n1' });
    expect(count).toBe(1); // no additional calls
    graph.destroy();
  });

  it('state getter returns current snapshot', () => {
    const graph = useGraph<{ v: number }>('g');
    graph.addNode({ id: 'n1', v: 42 });
    const state = graph.state;
    expect(state.nodes['n1']).toBeDefined();
    expect(state.nodes['n1'].data.v).toBe(42);
    graph.destroy();
  });
});

// ---------------------------------------------------------------------------
// graph.query() — $derived reactive queries
// ---------------------------------------------------------------------------

describe('useGraph — query() ($derived reactive queries)', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('query returns initial derived value', () => {
    const graph = useGraph<{ active: boolean }>('g');
    graph.addNode({ id: 'a', active: true });
    graph.addNode({ id: 'b', active: false });
    const active = graph.query(nodes => nodes.filter(n => n.data.active));
    expect(active.value).toHaveLength(1);
    expect(active.value[0].id).toBe('a');
    active.destroy();
    graph.destroy();
  });

  it('query.value updates when graph changes', () => {
    const graph = useGraph<{ done: boolean }>('g');
    const done = graph.query(nodes => nodes.filter(n => n.data.done));
    expect(done.value).toHaveLength(0);
    graph.addNode({ id: 'n1', done: true });
    expect(done.value).toHaveLength(1);
    done.destroy();
    graph.destroy();
  });

  it('query.subscribe() fires immediately and on changes', () => {
    const graph = useGraph<{ active: boolean }>('g');
    const q = graph.query(nodes => nodes.filter(n => n.data.active));
    const snapshots: any[] = [];
    const unsub = q.subscribe(v => snapshots.push(v));
    expect(snapshots).toHaveLength(1); // immediate
    graph.addNode({ id: 'n1', active: true });
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    unsub();
    q.destroy();
    graph.destroy();
  });

  it('query selector receives both nodes and edges', () => {
    const graph = useGraph<{ label: string }, { weight: number }>('g');
    graph.addNode({ id: 'a', label: 'A' });
    graph.addNode({ id: 'b', label: 'B' });
    graph.addEdge('a', 'b', { weight: 7 });
    const heavyEdges = graph.query((_nodes, edges) =>
      edges.filter(e => e.data.weight > 5),
    );
    expect(heavyEdges.value).toHaveLength(1);
    heavyEdges.destroy();
    graph.destroy();
  });

  it('query.subscribe() stops firing after query.destroy()', () => {
    const graph = useGraph('g');
    const q = graph.query(nodes => nodes);
    let count = 0;
    const unsub = q.subscribe(() => count++);
    expect(count).toBe(1);
    q.destroy();
    graph.addNode({ id: 'n1' });
    expect(count).toBe(1); // no more calls
    unsub();
    graph.destroy();
  });
});

// ---------------------------------------------------------------------------
// findPath() — BFS shortest path
// ---------------------------------------------------------------------------

describe('useGraph — findPath()', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('returns empty array when fromId does not exist', () => {
    const graph = useGraph('g');
    expect(graph.findPath('missing', 'also-missing')).toEqual([]);
    graph.destroy();
  });

  it('returns [node] when fromId === toId', () => {
    const graph = useGraph<{ label: string }>('g');
    graph.addNode({ id: 'a', label: 'A' });
    const path = graph.findPath('a', 'a');
    expect(path).toHaveLength(1);
    expect(path[0].id).toBe('a');
    graph.destroy();
  });

  it('returns empty array when no path exists', () => {
    const graph = useGraph('g');
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    // No edge added
    expect(graph.findPath('a', 'b')).toEqual([]);
    graph.destroy();
  });

  it('finds a direct path (one edge)', () => {
    const graph = useGraph('g');
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    graph.addEdge('a', 'b');
    const path = graph.findPath('a', 'b');
    expect(path.map(n => n.id)).toEqual(['a', 'b']);
    graph.destroy();
  });

  it('finds the shortest path through multiple hops', () => {
    const graph = useGraph('g');
    //  a → b → d
    //  a → c → d  (longer path)
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    graph.addNode({ id: 'c' });
    graph.addNode({ id: 'd' });
    graph.addEdge('a', 'b');
    graph.addEdge('b', 'd');
    graph.addEdge('a', 'c');
    graph.addEdge('c', 'd');
    const path = graph.findPath('a', 'd');
    // Both are length 3 (BFS finds one of them)
    expect(path).toHaveLength(3);
    expect(path[0].id).toBe('a');
    expect(path[path.length - 1].id).toBe('d');
    graph.destroy();
  });

  it('does not follow edges backwards', () => {
    const graph = useGraph('g');
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    graph.addEdge('a', 'b'); // directed: a → b only
    expect(graph.findPath('b', 'a')).toEqual([]); // no reverse path
    graph.destroy();
  });

  it('handles cycles without infinite loop', () => {
    const graph = useGraph('g');
    graph.addNode({ id: 'a' });
    graph.addNode({ id: 'b' });
    graph.addNode({ id: 'c' });
    graph.addEdge('a', 'b');
    graph.addEdge('b', 'c');
    graph.addEdge('c', 'a'); // cycle back
    const path = graph.findPath('a', 'c');
    expect(path).toHaveLength(3);
    expect(path[0].id).toBe('a');
    expect(path[2].id).toBe('c');
    graph.destroy();
  });
});

// ---------------------------------------------------------------------------
// destroy()
// ---------------------------------------------------------------------------

describe('useGraph — destroy()', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('destroy() prevents future subscriber notifications', () => {
    const graph = useGraph('g');
    let count = 0;
    graph.subscribe(() => count++);
    expect(count).toBe(1);
    graph.destroy();
    graph.addNode({ id: 'n1' }); // mutates local state but no DB sub active
    expect(count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// TypeScript generics — compile-time smoke test
// ---------------------------------------------------------------------------

describe('useGraph — TypeScript generics', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('accepts typed node and edge generics', () => {
    interface NodeData { label: string; active: boolean }
    interface EdgeData { weight: number }

    const graph = useGraph<NodeData, EdgeData>('typed');
    const nid = graph.addNode({ label: 'start', active: true });
    const nid2 = graph.addNode({ label: 'end', active: false });
    const eid = graph.addEdge(nid, nid2, { weight: 3 });

    expect(graph.nodes[0].data.label).toBeDefined();
    expect(graph.edges[0].data.weight).toBeDefined();

    const q = graph.query(nodes => nodes.filter(n => n.data.active));
    expect(q.value).toHaveLength(1);
    q.destroy();

    graph.updateNode(nid, { active: false });
    graph.updateEdge(eid, { weight: 99 });
    graph.removeEdge(eid);
    graph.removeNode(nid);

    graph.destroy();
  });
});
