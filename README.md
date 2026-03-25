# @plures/unum

Reactive [PluresDB](https://github.com/plures/pluresdb) bindings for Svelte — backend-agnostic, TypeScript-first, Svelte 5 runes-ready.

## Features

- **Svelte 4 & 5 Compatible** — store protocol _and_ runes (`$state`, `$derived`, `$effect`)
- **TypeScript-first** — fully typed generics throughout
- **Backend-agnostic** — swap databases via the `DbAdapter` interface
- **Real-time** — subscription-based reactivity, no polling
- **P2P** — optional Hyperswarm adapter for peer-to-peer graph sync
- **Graph & Collection APIs** — purpose-built primitives for complex data

## Installation

```bash
npm install @plures/unum
```

## Quick Start

```ts
import { initDb, createMemoryAdapter, createCollection } from '@plures/unum';

// 1. Initialize with an adapter once at app startup
initDb(createMemoryAdapter());

// 2. Use reactive APIs anywhere
interface Task { title: string; done: boolean }
const tasks = createCollection<Task>('tasks');

const id = tasks.add({ title: 'Buy milk', done: false });
tasks.update(id, { done: true });
tasks.remove(id);
```

## API Reference

### Adapter Setup

#### `initDb(adapter)`

Initialize unum with a database adapter.  Call once at app startup before
using any data bindings.

```ts
import { initDb, createPluresDbAdapter } from '@plures/unum';
import PluresDB from 'pluresdb';

initDb(createPluresDbAdapter(new PluresDB({ localStorage: true })));
```

#### `destroyDb()`

Tear down the current adapter and reset the context.

#### `getAdapter()`

Return the current `DbAdapter` (throws if `initDb()` has not been called).

#### `getRoot()`

Return a root `ChainNode` from the current adapter.

#### `db`

Svelte-compatible readable store containing the current `DbAdapter | null`.
Useful for lazy-init patterns.

---

### Collections — `createCollection<T>(path)`

Create a reactive typed collection binding backed by PluresDB.

```svelte
<script>
  import { createCollection } from '@plures/unum';

  interface Task { title: string; done: boolean }
  const tasks = createCollection<Task>('tasks');

  const pending = tasks.query(items => items.filter(i => !i.data.done));
</script>

{#each tasks.items as task}
  <p class:done={task.data.done}>{task.data.title}</p>
{/each}
```

**`CollectionRef<T>` properties & methods**

| Member | Description |
|---|---|
| `items` | Current items as `Array<CollectionItem<T>>` |
| `size` | Number of items |
| `add(data)` | Add an item; returns generated ID |
| `update(id, data)` | Merge partial data into an item |
| `remove(id)` | Delete an item |
| `get(id)` | Retrieve a single item (or `undefined`) |
| `query(selector)` | Create a derived reactive query (returns `CollectionQuery<R>`) |
| `subscribe(cb)` | Svelte 4 store protocol |
| `destroy()` | Tear down subscriptions |

---

### Graph — `useGraph<N, E>(path)`

Create a reactive typed graph binding backed by PluresDB.

```svelte
<script>
  import { useGraph } from '@plures/unum';

  const graph = useGraph<{ label: string }, { weight: number }>('my-graph');

  const heavy = graph.query(
    (nodes, edges) => edges.filter(e => e.data.weight > 10)
  );
</script>

{#each graph.nodes as node}
  <p>{node.data.label}</p>
{/each}
```

**`GraphRef<N, E>` properties & methods**

| Member | Description |
|---|---|
| `nodes` | Current nodes as `Array<GraphNode<N>>` |
| `edges` | Current edges as `Array<GraphEdge<E>>` |
| `state` | Full `GraphState<N, E>` snapshot |
| `addNode(data)` | Add a node; returns generated ID |
| `updateNode(id, data)` | Merge partial data into a node |
| `removeNode(id)` | Remove a node and all its incident edges |
| `addEdge(source, target, data?)` | Add a directed edge; returns generated ID |
| `updateEdge(id, data)` | Merge partial data into an edge |
| `removeEdge(id)` | Remove an edge |
| `query(selector)` | Create a derived reactive query (returns `GraphQuery<T>`) |
| `findPath(fromId, toId)` | BFS shortest path between two nodes |
| `subscribe(cb)` | Svelte 4 store protocol |
| `destroy()` | Tear down subscriptions |

---

### Reactive Data — `pluresData<T>(path, id?)`

Low-level reactive binding to a PluresDB path.  Suitable for single-document
or collection bindings without the typed Collection API.

```svelte
<script>
  import { pluresData } from '@plures/unum';
  const todos = pluresData('todos');
</script>

{#each todos.list() as todo}
  <p>{todo.text}</p>
{/each}
```

**`DataRef<T>` properties & methods**

| Member | Description |
|---|---|
| `state` | Current raw state snapshot |
| `value` | Single item (id-bound) or item array (collection) |
| `list()` | Items as an array (collections only) |
| `add(data)` | Add an item to the collection |
| `update(idOrUpdater, updater?)` | Update item(s) |
| `remove(id?)` | Remove an item (or the bound item) |
| `subscribe(cb)` | Svelte store protocol |
| `destroy()` | Tear down subscriptions |

---

### Derived & Bind — `pluresDerived` / `pluresBind`

```ts
import { pluresData, pluresDerived, pluresBind } from '@plures/unum';

const todos  = pluresData('todos');
const done   = pluresDerived(todos, items => items.filter(i => i.done));
const title  = pluresBind(todos, 'title');   // two-way binding for a field
```

---

### Store — `PluresStore<T>` / `createPluresStore<T>`

A Svelte-compatible writable store that syncs a single scalar value with
PluresDB.  Implements the full store contract (`subscribe` / `set` / `update`).

```ts
import { initDb, createMemoryAdapter, createPluresStore } from '@plures/unum';

initDb(createMemoryAdapter());

const theme = createPluresStore<'light' | 'dark'>('settings/theme', 'light');
theme.set('dark');
theme.update(t => t === 'dark' ? 'light' : 'dark');
theme.destroy();
```

---

### Adapters

#### `createMemoryAdapter()`

Fully in-memory adapter.  Data is not persisted.  Ideal for unit tests and
server-side rendering.

```ts
import { initDb, createMemoryAdapter } from '@plures/unum';
initDb(createMemoryAdapter());
```

#### `createPluresDbAdapter(db)`

Wrap a [PluresDB](https://github.com/plures/pluresdb) instance.

```ts
import PluresDB from 'pluresdb';
import { initDb, createPluresDbAdapter } from '@plures/unum';

initDb(createPluresDbAdapter(new PluresDB({ localStorage: true })));
```

#### `createGunAdapter(gun)`

Wrap an existing [Gun.js](https://gun.eco) instance for migration scenarios.

```ts
import Gun from 'gun';
import { initDb } from '@plures/unum';
import { createGunAdapter } from '@plures/unum/adapters';

initDb(createGunAdapter(Gun({ peers: ['http://localhost:8765/gun'] })));
```

#### `createHyperswarmAdapter(swarm, inner)`

Add P2P sync to any inner adapter via [Hyperswarm](https://github.com/hyperswarm/hyperswarm).

```ts
import Hyperswarm from 'hyperswarm';
import { createHash } from 'node:crypto';
import { initDb, createMemoryAdapter } from '@plures/unum';
import { createHyperswarmAdapter } from '@plures/unum/adapters';

const swarm = new Hyperswarm();
swarm.join(createHash('sha256').update('my-topic').digest());

initDb(createHyperswarmAdapter(swarm, createMemoryAdapter()));
```

---

### Praxis Modules (`@plures/unum/praxis`)

Logic modules for the [@plures/praxis](https://github.com/plures/praxis) rule engine.

| Module | Factory | Description |
|---|---|---|
| Merge Policy | `mergePolicyModule(config)` | Conflict resolution for multi-source data |
| Schema Unification | `schemaUnificationModule(config)` | Schema compatibility & coercion rules |
| Subscription Policy | `subscriptionPolicyModule(config)` | Stream routing & auth gate |
| Freshness | `freshnessModule(config)` | TTL / cache-invalidation rules |

```ts
import { PraxisRegistry } from '@plures/praxis';
import {
  mergePolicyModule,
  schemaUnificationModule,
  subscriptionPolicyModule,
  freshnessModule,
} from '@plures/unum/praxis';

const registry = new PraxisRegistry();
registry.registerModule(mergePolicyModule({ priorities: { remote: 10, local: 5 } }));
registry.registerModule(schemaUnificationModule());
registry.registerModule(subscriptionPolicyModule({ requireAuth: true }));
registry.registerModule(freshnessModule({ defaultTtlMs: 60_000 }));
```

---

### Utility Helpers

These helpers are exported from the main package entry point.

| Helper | Description |
|---|---|
| `isPluresAvailable(adapter)` | Type guard — returns `true` when adapter is non-null |
| `safeGet(obj, path, default?)` | Read a deeply nested property via dot-path |
| `safeMap(dbData, callback, filter?)` | Transform a DB record object into an array |
| `safeChain(adapter, path?)` | Build a `ChainNode` from a dot-separated path string |

---

## Custom Adapters

Implement the `DbAdapter` interface to connect any backend:

```ts
import type { DbAdapter, ChainNode } from '@plures/unum';

export function createMyAdapter(): DbAdapter {
  return {
    root(): ChainNode {
      // return a ChainNode bound to your backend
    },
    destroy?(): void {
      // optional cleanup
    },
  };
}
```

---

## License

MIT