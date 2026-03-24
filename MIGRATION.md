# Migration Guide: Svelte 4 Store API → `useGraph()` Runes API

This guide explains how to migrate from the legacy `PluresStore`/`pluresData` API (Svelte 4)
to the new `useGraph()` runes-compatible API (Svelte 5).

---

## Why migrate?

| Feature | `PluresStore` / `pluresData` | `useGraph()` |
|---|---|---|
| Svelte version | 4 (stores) | 4 + **5 runes** |
| Graph structure | Flat key/value | Nodes + directed edges |
| Derived queries | Manual filter on `.list()` | `.query()` — reactive, store-protocol |
| Path finding | ❌ not available | ✅ BFS `findPath()` |
| TypeScript generics | Partial | Full `N` / `E` type params |
| `$effect` subscriptions | Manual | Built-in via `.subscribe()` |
| `$derived` reactivity | Via `pluresDerived()` | Via `.query()` |

---

## Quick comparison

### Svelte 4 — `PluresStore`

```svelte
<script>
  import { createPluresStore, initDb, createMemoryAdapter } from '@plures/unum';

  initDb(createMemoryAdapter());

  const todos = createPluresStore('todos', []);
</script>

{#each $todos as todo}
  <p>{todo.text}</p>
{/each}
```

### Svelte 5 — `useGraph()`

```svelte
<script>
  import { useGraph, initDb, createMemoryAdapter } from '@plures/unum';

  initDb(createMemoryAdapter());

  const graph = useGraph<{ text: string; done: boolean }>('todos');

  // Reactive derived query — equivalent to a $derived expression
  const pending = graph.query(nodes => nodes.filter(n => !n.data.done));

  // Side-effect subscription managed by $effect
  $effect(() => {
    return graph.subscribe(state => {
      console.log('graph changed', Object.keys(state.nodes).length, 'nodes');
    });
  });
</script>

{#each graph.nodes as node}
  <p>{node.data.text}</p>
{/each}

<p>Pending: {pending.value.length}</p>
```

---

## Step-by-step migration

### 1. Replace `pluresData()` collection binding

**Before (Svelte 4)**
```ts
const todos = pluresData<{ text: string }>('todos');
todos.add({ text: 'Buy milk' });
todos.update('abc', { text: 'Updated' });
todos.remove('abc');
```

**After (Svelte 5)**
```ts
const graph = useGraph<{ text: string }>('todos');
graph.addNode({ text: 'Buy milk' });
graph.updateNode('abc', { text: 'Updated' });
graph.removeNode('abc');
```

### 2. Replace `pluresDerived()` with `graph.query()`

**Before**
```ts
const done = pluresDerived(todos, items => items.filter(i => i.done));
// done.value — current derived value
```

**After**
```ts
const done = graph.query(nodes => nodes.filter(n => n.data.done));
// done.value — current derived value (reactive)
// $done      — Svelte 4 auto-subscription
```

`query()` accepts an optional second argument for edges:
```ts
const heavyEdges = graph.query((_nodes, edges) =>
  edges.filter(e => e.data.weight > 10)
);
```

### 3. Replace `$store` auto-subscription with `$derived`

**Svelte 4**
```svelte
<p>{$done.length} done items</p>
```

**Svelte 5**
```svelte
<p>{done.value.length} done items</p>
```

Or wrap in `$derived` for reactive expressions:
```svelte
<script>
  const doneCount = $derived(done.value.length);
</script>
<p>{doneCount} done items</p>
```

### 4. Manage subscriptions with `$effect`

```svelte
<script>
  $effect(() => {
    // graph.subscribe returns an unsubscribe function — return it for cleanup
    return graph.subscribe(state => {
      analytics.track('graph-update', { nodeCount: Object.keys(state.nodes).length });
    });
  });
</script>
```

### 5. Add relationships with edges

Edges are a new concept introduced by `useGraph()`. Use them to represent
connections between nodes (e.g. task dependencies, user follows, etc.):

```ts
const graph = useGraph<{ label: string }, { weight: number }>('workflow');

const taskA = graph.addNode({ label: 'Design' });
const taskB = graph.addNode({ label: 'Implementation' });
const taskC = graph.addNode({ label: 'Review' });

graph.addEdge(taskA, taskB, { weight: 1 });
graph.addEdge(taskB, taskC, { weight: 2 });

// Find the path from Design → Review
const path = graph.findPath(taskA, taskC);
// → [{ id: taskA, data: { label: 'Design' } },
//    { id: taskB, data: { label: 'Implementation' } },
//    { id: taskC, data: { label: 'Review' } }]
```

---

## API Reference

### `useGraph<N, E>(path: string): GraphRef<N, E>`

| Member | Type | Description |
|---|---|---|
| `.nodes` | `GraphNode<N>[]` | Current nodes (reactive getter) |
| `.edges` | `GraphEdge<E>[]` | Current edges (reactive getter) |
| `.state` | `GraphState<N, E>` | Full state snapshot |
| `.addNode(data)` | `→ string` | Add a node, return its ID |
| `.updateNode(id, data)` | `void` | Merge data into a node |
| `.removeNode(id)` | `void` | Remove node + incident edges |
| `.addEdge(src, tgt, data?)` | `→ string` | Add a directed edge |
| `.updateEdge(id, data)` | `void` | Merge data into an edge |
| `.removeEdge(id)` | `void` | Remove an edge |
| `.query(selector)` | `GraphQuery<T>` | Reactive derived query |
| `.findPath(from, to)` | `GraphNode<N>[]` | BFS shortest path |
| `.subscribe(cb)` | `Unsubscribe` | Svelte 4 store protocol |
| `.destroy()` | `void` | Cleanup all subscriptions |

### `GraphQuery<T>`

| Member | Type | Description |
|---|---|---|
| `.value` | `T` | Current computed value |
| `.subscribe(cb)` | `Unsubscribe` | Svelte store protocol |
| `.destroy()` | `void` | Cleanup this query |

---

## Backward compatibility

The legacy `pluresData`, `pluresDerived`, `pluresBind`, `PluresStore`, and
`createPluresStore` APIs remain available and are not deprecated. They continue
to work with Svelte 4 stores. `useGraph()` is an additive API for users who
want Svelte 5 runes-style graph reactivity.
