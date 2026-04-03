# @plures/unum API Reference

Complete exported API surface for `@plures/unum`.

**Package exports:**
- `@plures/unum` — core reactive bindings, adapters, and utility helpers
- `@plures/unum/adapters` — database adapters (re-exports from the main package)
- `@plures/unum/praxis` — declarative Praxis rule-engine modules

---

## Table of Contents

- [Core Context](#core-context)
- [Collections](#collections)
- [Graph](#graph)
- [Reactive Data Bindings](#reactive-data-bindings)
- [Svelte Store](#svelte-store)
- [Adapters](#adapters)
- [Utility Helpers](#utility-helpers)
- [Types](#types)
- [Praxis Modules](#praxis-modules)

---

## Core Context

Functions for initialising and tearing down the database adapter context.
Call `initDb()` once at app startup before using any reactive bindings.

---

### `initDb(adapter)`

```ts
function initDb(adapter: DbAdapter): void
```

Initialize unum with a database adapter.  Must be called once at app startup
before any reactive bindings (`pluresData`, `createCollection`, `useGraph`,
`PluresStore`) are used.  Calling a second time replaces the previous adapter
without destroying it — call `destroyDb()` first if cleanup is needed.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `adapter` | `DbAdapter` | The adapter implementation to use (e.g. `createMemoryAdapter()`, `createPluresDbAdapter(db)`, or `createHyperswarmAdapter(swarm, inner)`). |

**Returns** `void`

**Example**

```ts
import { initDb, createMemoryAdapter } from '@plures/unum';

initDb(createMemoryAdapter());
```

```ts
import { initDb, createPluresDbAdapter } from '@plures/unum';
import PluresDB from 'pluresdb';

const db = new PluresDB({ localStorage: true });
initDb(createPluresDbAdapter(db));
```

---

### `getAdapter()`

```ts
function getAdapter(): DbAdapter
```

Return the active `DbAdapter` set by `initDb()`.

Throws an `Error` with the message `'unum: call initDb() before using data bindings'`
if `initDb()` has not been called yet.

**Returns** `DbAdapter` — the currently active adapter.

**Throws** `Error` if `initDb()` has not been called.

**Example**

```ts
import { getAdapter } from '@plures/unum';

const adapter = getAdapter();
const root = adapter.root();
root.get('todos').on((data) => console.log(data));
```

---

### `getRoot()`

```ts
function getRoot(): ChainNode
```

Return a root `ChainNode` from the active adapter.  Shorthand for
`getAdapter().root()`.  Throws if `initDb()` has not been called.

**Returns** `ChainNode` — a chain node at the root of the database tree.

**Throws** `Error` if `initDb()` has not been called.

**Example**

```ts
import { getRoot } from '@plures/unum';

const ref = getRoot().get('settings').get('theme');
ref.on((value) => console.log('theme changed:', value));
```

---

### `destroyDb()`

```ts
function destroyDb(): void
```

Tear down the current adapter and reset the context.  Calls the adapter's
optional `destroy()` method (if present), then sets the active adapter to
`null`.  Subsequent calls to `getAdapter()` or `getRoot()` will throw until
`initDb()` is called again.

**Returns** `void`

**Example**

```ts
import { initDb, destroyDb, createMemoryAdapter } from '@plures/unum';

initDb(createMemoryAdapter());
// ... use the database ...
destroyDb(); // release all resources
```

---

### `db`

```ts
const db: Readable<DbAdapter | null>
```

Svelte-compatible readable store containing the current `DbAdapter | null`.
Emits `null` before `initDb()` is called and after `destroyDb()` is called.

Useful for lazy-init patterns where you want to react to the adapter becoming
available rather than requiring synchronous setup.

**Type** `Readable<DbAdapter | null>`

**Example**

```svelte
<script>
  import { db, initDb, createMemoryAdapter } from '@plures/unum';
  initDb(createMemoryAdapter());
</script>

{#if $db}
  <p>Database ready</p>
{/if}
```

---

## Collections

High-level typed collection API.  Stores items at `{path}/{id}` in PluresDB.

---

### `createCollection<T>(path)`

```ts
function createCollection<T extends Record<string, unknown>>(path: string): CollectionRef<T>
```

Create a reactive typed collection binding backed by PluresDB.  Items are
stored at `{path}/{itemId}`.  The returned `CollectionRef<T>` implements the
Svelte 4 store protocol (`.subscribe()`) and exposes getter-based properties
that work naturally with Svelte 5 `$derived` expressions.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `path` | `string` | Base path in the database (e.g. `'tasks'`, `'users'`). |

**Returns** `CollectionRef<T>` — a reactive collection reference with CRUD methods, reactive accessors, and query support.

**Example — Svelte 5 runes**

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

**Example — programmatic usage**

```ts
import { initDb, createMemoryAdapter, createCollection } from '@plures/unum';

initDb(createMemoryAdapter());
interface Task { title: string; done: boolean }

const tasks = createCollection<Task>('tasks');
const id = tasks.add({ title: 'Buy milk', done: false });
tasks.update(id, { done: true });
tasks.remove(id);
tasks.destroy();
```

---

#### `CollectionRef<T>` — members

| Member | Signature | Description |
|---|---|---|
| `items` | `Array<CollectionItem<T>>` | Current items as a flat array (reactive getter). |
| `size` | `number` | Number of items in the collection (reactive getter). |
| `add(data)` | `(data: Omit<T, 'id'> & { id?: string }) => string` | Add an item; accepts an optional `id` field. Returns the generated or provided ID. |
| `update(id, data)` | `(id: string, data: Partial<Omit<T, 'id'>>) => void` | Merge partial data into an existing item. No-op if `id` is not found. |
| `remove(id)` | `(id: string) => void` | Remove an item by ID. Writes `null` to the DB path. |
| `get(id)` | `(id: string) => CollectionItem<T> \| undefined` | Retrieve a single item by ID, or `undefined` if not found. |
| `query(selector)` | `<R>(selector: (items: Array<CollectionItem<T>>) => R) => CollectionQuery<R>` | Create a derived reactive query. The selector re-evaluates on every collection change. |
| `subscribe(cb)` | `(cb: (items: Array<CollectionItem<T>>) => void) => Unsubscribe` | Svelte 4 store protocol — fires immediately with the current snapshot. |
| `destroy()` | `() => void` | Tear down all DB subscriptions and release memory. |

---

#### `CollectionQuery<R>` — members

| Member | Signature | Description |
|---|---|---|
| `value` | `R` | Current computed value (reactive getter). |
| `subscribe(cb)` | `(cb: (value: R) => void) => Unsubscribe` | Svelte store protocol. |
| `destroy()` | `() => void` | Remove the internal subscription and release memory. |

---

## Graph

Reactive typed graph API.  Nodes are stored at `{path}/nodes/{id}` and edges
at `{path}/edges/{id}`.  The `source` and `target` fields are reserved on edge
objects.

---

### `useGraph<N, E>(path)`

```ts
function useGraph<
  N extends Record<string, unknown>,
  E extends Record<string, unknown>,
>(path: string): GraphRef<N, E>
```

Create a reactive typed graph binding backed by PluresDB.  The returned
`GraphRef<N, E>` implements the Svelte 4 store protocol and exposes reactive
getter properties for Svelte 5.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `path` | `string` | Base path in the database (e.g. `'my-graph'`). |

**Returns** `GraphRef<N, E>` — a reactive graph reference with node/edge CRUD, reactive accessors, path-finding, and query support.

**Example — Svelte 5 runes**

```svelte
<script>
  import { useGraph } from '@plures/unum';

  const graph = useGraph<{ label: string }, { weight: number }>('my-graph');

  const heavy = graph.query((nodes, edges) =>
    edges.filter(e => e.data.weight > 10)
  );
</script>

{#each graph.nodes as node}
  <p>{node.data.label}</p>
{/each}
```

**Example — programmatic usage**

```ts
import { initDb, createMemoryAdapter, useGraph } from '@plures/unum';

initDb(createMemoryAdapter());
const graph = useGraph<{ label: string }, { weight: number }>('my-graph');

const a = graph.addNode({ label: 'A' });
const b = graph.addNode({ label: 'B' });
graph.addEdge(a, b, { weight: 5 });

console.log(graph.findPath(a, b)); // [{ id: a, ... }, { id: b, ... }]
graph.destroy();
```

---

#### `GraphRef<N, E>` — members

| Member | Signature | Description |
|---|---|---|
| `nodes` | `Array<GraphNode<N>>` | Current nodes as a flat array (reactive getter). |
| `edges` | `Array<GraphEdge<E>>` | Current edges as a flat array (reactive getter). |
| `state` | `GraphState<N, E>` | Full graph snapshot with `nodes` and `edges` maps (reactive getter). |
| `addNode(data)` | `(data: N & { id?: string }) => string` | Add a node. Returns the generated or provided ID. |
| `updateNode(id, data)` | `(id: string, data: Partial<N>) => void` | Merge partial data into an existing node. No-op if `id` is not found. |
| `removeNode(id)` | `(id: string) => void` | Remove a node and all its incident edges. |
| `addEdge(source, target, data?)` | `(source: string, target: string, data?: Partial<E>) => string` | Add a directed edge. Returns the generated ID. |
| `updateEdge(id, data)` | `(id: string, data: Partial<E>) => void` | Merge partial data into an existing edge. No-op if `id` is not found. |
| `removeEdge(id)` | `(id: string) => void` | Remove an edge by ID. |
| `query(selector)` | `<T>(selector: (nodes: Array<GraphNode<N>>, edges: Array<GraphEdge<E>>) => T) => GraphQuery<T>` | Create a derived reactive query. |
| `findPath(fromId, toId)` | `(fromId: string, toId: string) => Array<GraphNode<N>>` | BFS shortest path between two nodes. Returns an empty array if no path exists. |
| `subscribe(cb)` | `(cb: (state: GraphState<N, E>) => void) => Unsubscribe` | Svelte 4 store protocol. |
| `destroy()` | `() => void` | Tear down all DB subscriptions and release memory. |

---

#### `GraphQuery<T>` — members

| Member | Signature | Description |
|---|---|---|
| `value` | `T` | Current computed value (reactive getter). |
| `subscribe(cb)` | `(cb: (value: T) => void) => Unsubscribe` | Svelte store protocol. |
| `destroy()` | `() => void` | Remove the internal subscription and release memory. |

---

## Reactive Data Bindings

Low-level reactive binding primitives.  For most use cases prefer
`createCollection()` or `useGraph()`.

---

### `pluresData<T>(path, id?)`

```ts
function pluresData<T extends Record<string, unknown>>(
  path: string,
  id?: string | null,
): DataRef<T>
```

Create a reactive binding to a PluresDB path.  When `id` is omitted the
binding listens to all children of `path` (collection mode).  When `id` is
provided it listens to the single document at `{path}/{id}`.

No polling — uses pure subscription-based reactivity.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `path` | `string` | Collection or document path (e.g. `'todos'`, `'users/profile'`). |
| `id` | `string \| null \| undefined` | Optional item ID for single-document binding. |

**Returns** `DataRef<T>` — a reactive reference with `state`, `value`, `list()`, `add()`, `update()`, `remove()`, `subscribe()`, and `destroy()`.

**Example — collection binding**

```svelte
<script>
  import { pluresData } from '@plures/unum';
  const todos = pluresData('todos');
</script>

{#each todos.list() as todo}
  <p>{todo.text}</p>
{/each}
```

**Example — single document binding**

```ts
import { pluresData } from '@plures/unum';
const profile = pluresData('users', 'alice');
profile.subscribe(data => console.log('profile:', data));
```

---

### `pluresDerived<T>(source, transform)`

```ts
function pluresDerived<T>(
  source: DataRef,
  transform: (items: Array<Record<string, unknown> & { id: string }>) => T[],
): { readonly value: T[]; destroy(): void }
```

Create a derived view from an existing `DataRef`.  Re-evaluates `transform`
each time the source changes.  The result is exposed as a `.value` getter —
no polling, no extra subscriptions.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `source` | `DataRef` | A `DataRef` returned by `pluresData()`. |
| `transform` | `(items: Array<Record<string, unknown> & { id: string }>) => T[]` | Pure function that maps the source item list to a new array. |

**Returns** `{ readonly value: T[]; destroy(): void }` — a derived view with a `.value` getter and a `destroy()` cleanup method.

**Example**

```ts
import { pluresData, pluresDerived } from '@plures/unum';

const todos = pluresData('todos');
const pending = pluresDerived(todos, items => items.filter(i => !i.done));
console.log(pending.value);
pending.destroy();
```

---

### `pluresBind(source, field)`

```ts
function pluresBind(source: DataRef, field: string): {
  value: unknown;
  destroy(): void;
}
```

Create a two-way binding helper for a single field in a `DataRef`.  The
returned object exposes a `value` getter/setter that reads from and writes to
the underlying `DataRef`.  Designed for use with Svelte 5's `bind:value` on
native inputs.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `source` | `DataRef` | A `DataRef` returned by `pluresData()`. |
| `field` | `string` | The key on the data object to bind (e.g. `'name'`). |

**Returns** `{ value: unknown; destroy(): void }` — an object with a reactive `value` getter/setter and a `destroy()` cleanup method.

**Example**

```svelte
<script>
  import { pluresData, pluresBind } from '@plures/unum';
  const profile = pluresData('profile', 'me');
  const name = pluresBind(profile, 'name');
</script>
<input bind:value={name.value} />
```

---

## Svelte Store

A Svelte-compatible writable store backed by PluresDB.

---

### `class PluresStore<T>`

```ts
class PluresStore<T = unknown>
```

A Svelte-compatible writable store that syncs a single value with PluresDB.
Implements the Svelte store contract (`subscribe` / `set` / `update`) so it
can be used with the `$store` auto-subscription syntax in Svelte 4, or
manually subscribed to in Svelte 5.  All writes are persisted to PluresDB;
all incoming DB updates are reflected reactively.

**Type Parameters**

| Name | Description |
|---|---|
| `T` | Shape of the value stored at `path`. Defaults to `unknown`. |

**Constructor**

```ts
new PluresStore<T>(path: string, initialValue?: T)
```

| Parameter | Type | Description |
|---|---|---|
| `path` | `string` | Path in PluresDB to bind to (e.g. `'settings/theme'`). |
| `initialValue` | `T \| undefined` | Optional initial value used before the first DB read. |

**Methods**

| Method | Signature | Description |
|---|---|---|
| `subscribe(run)` | `(run: (value: T) => void) => Unsubscribe` | Subscribe to value changes — Svelte store protocol. |
| `set(value)` | `(value: T) => void` | Write a new value and persist it to PluresDB. |
| `update(updater)` | `(updater: (current: T) => T) => void` | Apply a pure function to the current value and persist the result. |
| `destroy()` | `() => void` | Unsubscribe from PluresDB and release all resources. |

**Example**

```ts
import { initDb, createMemoryAdapter, PluresStore } from '@plures/unum';

initDb(createMemoryAdapter());
const counter = new PluresStore<number>('counter', 0);

counter.set(42);
counter.update(n => n + 1); // 43
counter.destroy();
```

---

### `createPluresStore<T>(path, initialValue?)`

```ts
function createPluresStore<T = unknown>(path: string, initialValue?: T): PluresStore<T>
```

Factory helper — creates a `PluresStore` for a given `path`.  Prefer this
over `new PluresStore()` when you want to infer types without explicitly
invoking the constructor.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `path` | `string` | Path in PluresDB to bind to. |
| `initialValue` | `T \| undefined` | Optional initial value used before the first DB read. |

**Returns** `PluresStore<T>` — a new `PluresStore` bound to `path`.

**Example**

```ts
import { initDb, createMemoryAdapter, createPluresStore } from '@plures/unum';

initDb(createMemoryAdapter());
const theme = createPluresStore<'light' | 'dark'>('settings/theme', 'light');
theme.set('dark');
theme.destroy();
```

---

## Adapters

Adapters connect unum to a specific database backend.  Pass an adapter to
`initDb()` to activate it.

---

### `createMemoryAdapter()`

```ts
function createMemoryAdapter(): DbAdapter
```

Create a fully in-memory `DbAdapter`.  Stores all data in plain JavaScript
`Map`s and `Set`s.  Supports the full `ChainNode` API and fires listeners
synchronously on every write.

Ideal for:
- Unit tests — no real database needed.
- Server-side rendering — safe in Node.js / Deno without persistence.
- The `inner` adapter for `createHyperswarmAdapter()`.

**Returns** `DbAdapter` — a new `DbAdapter` backed entirely by in-memory data structures.

**Example**

```ts
import { initDb, createMemoryAdapter } from '@plures/unum';

initDb(createMemoryAdapter());
```

---

### `createPluresDbAdapter(db)`

```ts
function createPluresDbAdapter(db: PluresDbChainLike): DbAdapter
```

Wrap a PluresDB or Gun instance as a `DbAdapter`.  PluresDB exposes a
Gun-compatible chain API (`get`, `put`, `on`, `once`, `map`, `off`).  This
adapter normalises that API into the unum `ChainNode` interface.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `db` | `PluresDbChainLike` | A PluresDB or Gun instance with `.get`, `.put`, `.on`, `.once`, `.map`, and `.off` methods. |

**Returns** `DbAdapter` — a `DbAdapter` wrapping the given database instance.

**Example**

```ts
import PluresDB from 'pluresdb';
import { initDb, createPluresDbAdapter } from '@plures/unum';

const db = new PluresDB({ localStorage: true });
initDb(createPluresDbAdapter(db));
```

---

### `createGunAdapter(gun)`

```ts
function createGunAdapter(gun: GunChainLike): DbAdapter
```

Wrap a Gun.js instance as a `DbAdapter`.  Gun already exposes `get`, `put`,
`on`, `once`, `off`, and `map` — the same chain API modelled by `ChainNode` —
so this is a lightweight typed façade with no runtime overhead.

Install Gun separately (`npm install gun`); it is not bundled with unum.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `gun` | `GunChainLike` | A Gun.js instance (from the `gun` npm package). |

**Returns** `DbAdapter` — a `DbAdapter` wrapping the given Gun instance.

**Example**

```ts
import Gun from 'gun';
import { initDb, createGunAdapter } from '@plures/unum';

const gun = Gun({ peers: ['http://localhost:8765/gun'] });
initDb(createGunAdapter(gun));
```

---

### `createHyperswarmAdapter(swarm, inner)`

```ts
function createHyperswarmAdapter(swarm: HyperswarmLike, inner: DbAdapter): DbAdapter
```

Create a Hyperswarm-backed peer-sync adapter.  The returned adapter delegates
all reads/writes to `inner` and additionally broadcasts every `put` to all
connected Hyperswarm peers.  Incoming peer messages are applied to `inner`
without re-broadcasting, preventing echo loops.

Install Hyperswarm separately (`npm install hyperswarm`); it is not bundled.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `swarm` | `HyperswarmLike` | A Hyperswarm instance that has already joined a topic. |
| `inner` | `DbAdapter` | The underlying local storage adapter (e.g. `createMemoryAdapter()` or `createPluresDbAdapter(db)`). |

**Returns** `DbAdapter` — a `DbAdapter` that transparently syncs all writes to connected peers.

**Example**

```ts
import Hyperswarm from 'hyperswarm';
import { createHash } from 'node:crypto';
import { initDb, createMemoryAdapter, createHyperswarmAdapter } from '@plures/unum';

const swarm = new Hyperswarm();
const topic = createHash('sha256').update('my-graph-topic').digest();
swarm.join(topic);

const inner = createMemoryAdapter();
initDb(createHyperswarmAdapter(swarm, inner));
```

---

## Utility Helpers

---

### `isPluresAvailable(adapter)`

```ts
function isPluresAvailable(adapter: DbAdapter | null | undefined): adapter is DbAdapter
```

TypeScript type-guard that returns `true` when `adapter` is a non-null
`DbAdapter`.  Narrows the type in the truthy branch.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `adapter` | `DbAdapter \| null \| undefined` | The adapter value to test. |

**Returns** `boolean` (`adapter is DbAdapter`) — `true` if `adapter` is a non-null `DbAdapter`, otherwise `false`.

**Example**

```ts
import { isPluresAvailable, getAdapter } from '@plures/unum';

const adapter = getAdapter();
if (isPluresAvailable(adapter)) {
  // adapter is DbAdapter here
  adapter.root().get('todos');
}
```

---

### `safeGet<T>(obj, path, defaultValue?)`

```ts
function safeGet<T = unknown>(
  obj: unknown,
  path: string,
  defaultValue?: T,
): T | undefined
```

Safely reads a deeply nested property from a plain object using a
dot-delimited `path` string.  Returns `defaultValue` (or `undefined`) when
any segment along the path is `null`, `undefined`, or the property does not
exist.  Never throws.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `obj` | `unknown` | The root object to read from. |
| `path` | `string` | Dot-delimited path to the desired property (e.g. `'user.address.city'`). |
| `defaultValue` | `T \| undefined` | Value to return when the path cannot be resolved. |

**Returns** `T | undefined` — the value found at `path`, or `defaultValue` if not reachable.

**Example**

```ts
import { safeGet } from '@plures/unum';

const obj = { user: { name: 'Alice', age: 30 } };
safeGet(obj, 'user.name');         // 'Alice'
safeGet(obj, 'user.email', 'n/a'); // 'n/a'
safeGet(null, 'any.path', 0);      // 0
```

---

### `safeMap<T, R>(dbData, callback, filterFn?)`

```ts
function safeMap<T = unknown, R = unknown>(
  dbData: unknown,
  callback: (key: string, value: T) => R,
  filterFn?: (key: string, value: T) => boolean,
): R[]
```

Safely transforms a plain object of database records into an array.  Skips
Gun/PluresDB internal `_` metadata keys and silently ignores entries where
`callback` throws.  Returns an empty array when `dbData` is falsy or not an
object — never throws.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `dbData` | `unknown` | Raw database record object keyed by item ID. |
| `callback` | `(key: string, value: T) => R` | Mapper called with `(key, value)` for each entry. |
| `filterFn` | `((key: string, value: T) => boolean) \| undefined` | Optional predicate — only entries that return `true` are mapped. |

**Returns** `R[]` — array of transformed values (entries that throw in `callback` are omitted).

**Example**

```ts
import { safeMap } from '@plures/unum';

interface Todo { text: string; done: boolean }
const raw = { abc: { text: 'Buy milk', done: false }, _: { '#': 'meta' } };
const todos = safeMap<Todo, string>(raw, (id, v) => `${id}: ${v.text}`);
// ['abc: Buy milk']
```

---

### `safeChain(adapter, path?)`

```ts
function safeChain(adapter: DbAdapter | null, path?: string): ChainNode | null
```

Builds a chained `ChainNode` reference from a dot-separated `path` string,
with support for `#` as a shorthand for `.map()`.  Returns `null` when
`adapter` is `null` or when an error occurs during traversal — never throws.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `adapter` | `DbAdapter \| null` | A `DbAdapter` instance, or `null` (returns `null` when null). |
| `path` | `string \| undefined` | Optional dot-delimited path (e.g. `'todos'`, `'todos.#'`). Uses the root node when omitted. |

**Returns** `ChainNode | null` — a `ChainNode` for the requested path, or `null` on failure.

**Example**

```ts
import { safeChain, getAdapter } from '@plures/unum';

const ref = safeChain(getAdapter(), 'todos.#');
// equivalent to: getAdapter().root().get('todos').map()
```

---

## Types

Types re-exported from `@plures/unum`.

---

### `ChainNode`

```ts
interface ChainNode {
  get(key: string): ChainNode;
  put(data: unknown, cb?: DataCallback): ChainNode;
  set(data: unknown, cb?: DataCallback): ChainNode;
  on(cb: DataCallback): Unsubscribe;
  once(cb: DataCallback): void;
  map(): ChainNode;
  off(): void;
}
```

The fluent chain API for navigating and mutating data.  Mirrors PluresDB/Gun's
chain API but is backend-agnostic.

| Method | Description |
|---|---|
| `get(key)` | Navigate to a child key. |
| `put(data, cb?)` | Write data at this path. |
| `set(data, cb?)` | Add an item to a collection (auto-generates a key). |
| `on(cb)` | Subscribe to live updates. Returns an `Unsubscribe` function. |
| `once(cb)` | Read the current value once (no subscription). |
| `map()` | Return an iteration chain node — use `.on()` to iterate children. |
| `off()` | Unsubscribe all listeners at this path. |

---

### `DbAdapter`

```ts
interface DbAdapter {
  root(): ChainNode;
  destroy?(): void;
}
```

Implement this interface to plug any backend into unum.

| Method | Description |
|---|---|
| `root()` | Return the root `ChainNode`. |
| `destroy?()` | Optional cleanup called by `destroyDb()`. |

---

### `DataCallback`

```ts
type DataCallback = (data: unknown, key?: string) => void
```

Callback signature for data subscriptions.

| Parameter | Type | Description |
|---|---|---|
| `data` | `unknown` | The current value at the subscribed path. |
| `key` | `string \| undefined` | The key that changed (provided for `.map()` subscriptions). |

---

### `Unsubscribe`

```ts
type Unsubscribe = () => void
```

Function returned by `ChainNode.on()` and the Svelte store `.subscribe()`
method.  Call it to stop receiving updates.

---

### `DataRef<T>`

```ts
interface DataRef<T = Record<string, unknown>> {
  readonly state: T;
  readonly value: T | Array<T & { id: string }>;
  list(): Array<T & { id: string }>;
  add(data: Omit<T, 'id'> & { id?: string }): void;
  update(idOrUpdater: string | Partial<T> | ((item: T) => Partial<T>),
         updater?: Partial<T> | ((item: T) => Partial<T>)): void;
  remove(id?: string): void;
  subscribe(cb: (state: T) => void): Unsubscribe;
  destroy(): void;
}
```

Reactive data reference returned by `pluresData()`.

| Member | Description |
|---|---|
| `state` | Current state snapshot. |
| `value` | For collections: array of items. For single items: the item itself. |
| `list()` | Get all items as an array (collection mode only). |
| `add(data)` | Add an item to the collection. |
| `update(idOrUpdater, updater?)` | Update an item or the bound single document. |
| `remove(id?)` | Remove an item by ID (or the bound single document). |
| `subscribe(cb)` | Svelte-compatible subscribe. |
| `destroy()` | Clean up all subscriptions. |

---

### `CollectionItem<T>`

```ts
interface CollectionItem<T = Record<string, unknown>> {
  id: string;
  data: T;
}
```

A single item in a typed collection.

| Field | Description |
|---|---|
| `id` | Unique identifier for this item. |
| `data` | Application data stored on this item. |

---

### `GraphNode<T>`

```ts
interface GraphNode<T = Record<string, unknown>> {
  id: string;
  data: T;
}
```

A node in the graph.

| Field | Description |
|---|---|
| `id` | Unique identifier for this node. |
| `data` | Application data stored on this node. |

---

### `GraphEdge<T>`

```ts
interface GraphEdge<T = Record<string, unknown>> {
  id: string;
  source: string;
  target: string;
  data: T;
}
```

A directed edge in the graph.

| Field | Description |
|---|---|
| `id` | Unique identifier for this edge. |
| `source` | ID of the source node. |
| `target` | ID of the target node. |
| `data` | Application data stored on this edge. |

---

### `GraphState<N, E>`

```ts
interface GraphState<N = Record<string, unknown>, E = Record<string, unknown>> {
  nodes: Record<string, GraphNode<N>>;
  edges: Record<string, GraphEdge<E>>;
}
```

Complete snapshot of the graph emitted by `subscribe()`.

| Field | Description |
|---|---|
| `nodes` | Map of node ID → `GraphNode<N>`. |
| `edges` | Map of edge ID → `GraphEdge<E>`. |

---

### `PluresDataOptions`

```ts
interface PluresDataOptions {
  defaults?: Record<string, unknown>;
}
```

Options accepted by `pluresData()`.

| Field | Description |
|---|---|
| `defaults` | Initial/default data populated before the first DB read. |

---

## Praxis Modules

Declarative rule-based modules for the `@plures/praxis` rule engine.
Import from `@plures/unum/praxis`.

```ts
import {
  mergePolicyModule,
  schemaUnificationModule,
  subscriptionPolicyModule,
  freshnessModule,
} from '@plures/unum/praxis';
```

**Quick-start**

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

### `mergePolicyModule(config?)`

```ts
function mergePolicyModule(config?: MergePolicyConfig): PraxisModule
```

Create the merge-policy Praxis module.  Handles conflict resolution when
multiple sources provide the same data, source priority enforcement, and
deduplication logic.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `config` | `MergePolicyConfig \| undefined` | Optional configuration object. |

**`MergePolicyConfig`**

| Field | Type | Default | Description |
|---|---|---|---|
| `priorities` | `Record<string, number>` | `{}` | Source priority map. Higher numbers win conflicts. |
| `detectDuplicates` | `boolean` | `true` | Whether to detect and flag duplicate keys across sources. |

**Returns** `PraxisModule` — a module ready to register with a `PraxisRegistry`.

**Facts emitted**

| Fact | When emitted |
|---|---|
| `MergeConflictDetected` | Two or more sources provide conflicting values with no clear priority winner. |
| `MergeResolved` | A conflict is resolved by selecting the highest-priority source. |
| `DuplicateDetected` | The same source emits duplicate writes for an identical path within one step. |

**Events handled**

| Event | Description |
|---|---|
| `DataSourceUpdated` | A data source writes a new value to a path. |
| `MergeRequested` | Request a merge decision for competing source values at a path. |

**Example**

```ts
import { mergePolicyModule } from '@plures/unum/praxis';

registry.registerModule(mergePolicyModule({ priorities: { remote: 10, local: 5 } }));
```

---

### `schemaUnificationModule(config?)`

```ts
function schemaUnificationModule(config?: SchemaUnificationConfig): PraxisModule
```

Create the schema-unification Praxis module.  Handles type compatibility
checks between data sources, coercion gating, and field mapping validation
during schema unification.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `config` | `SchemaUnificationConfig \| undefined` | Optional configuration object. |

**`SchemaUnificationConfig`**

| Field | Type | Default | Description |
|---|---|---|---|
| `extraCoercions` | `string[]` | `[]` | Additional allowed coercion pairs beyond the built-in safe ones (e.g. `['float->integer']`). Format: `'fromType->toType'`. |
| `validateMappings` | `boolean` | `true` | Whether to validate field mappings between source and target schemas. |

**Returns** `PraxisModule` — a module ready to register with a `PraxisRegistry`.

**Facts emitted**

| Fact | When emitted |
|---|---|
| `SchemaCompatible` | Source type is assignment-compatible with target type. |
| `SchemaIncompatible` | Source type cannot be safely assigned to target type. |
| `CoercionAllowed` | A requested coercion is in the allowed list. |
| `CoercionBlocked` | A requested coercion is NOT in the allowed list. |
| `MappingValid` | A field mapping is well-formed. |
| `MappingInvalid` | A field mapping is malformed (e.g. empty field names). |

**Events handled**

| Event | Description |
|---|---|
| `SchemaCheckRequested` | Request a type-compatibility check between source and target types. |
| `CoercionRequested` | Request a coercion check for a specific type pair. |
| `MappingCheckRequested` | Request validation of a field mapping. |

**Example**

```ts
import { schemaUnificationModule } from '@plures/unum/praxis';

registry.registerModule(schemaUnificationModule({ extraCoercions: ['float->integer'] }));
```

---

### `subscriptionPolicyModule(config?)`

```ts
function subscriptionPolicyModule(config?: SubscriptionPolicyConfig): PraxisModule
```

Create the subscription-policy Praxis module.  Determines which reactive
streams should be subscribed based on context, applies filter rules, and
handles context-aware routing decisions.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `config` | `SubscriptionPolicyConfig \| undefined` | Optional configuration object. |

**`SubscriptionPolicyConfig`**

| Field | Type | Default | Description |
|---|---|---|---|
| `requireAuth` | `boolean` | `false` | Whether subscriptions require an authenticated context (`context.authenticated === true`). |
| `maxSubscriptions` | `number` | `Infinity` | Maximum number of concurrent subscriptions. |
| `allowedPaths` | `string[]` | `[]` (allow all) | Paths that are permitted. When non-empty, only listed paths are allowed. |
| `blockedPaths` | `string[]` | `[]` | Paths that are always blocked regardless of context. |

**Returns** `PraxisModule` — a module ready to register with a `PraxisRegistry`.

**Facts emitted**

| Fact | When emitted |
|---|---|
| `SubscriptionEligible` | A subscription request passes all eligibility checks. |
| `SubscriptionIneligible` | A subscription request fails one or more eligibility checks. |
| `StreamRouted` | An incoming stream update is forwarded to its target path. |
| `StreamFiltered` | An incoming stream update is dropped due to ineligibility. |

**Events handled**

| Event | Description |
|---|---|
| `SubscriptionRequested` | A consumer requests a subscription to a reactive stream. |
| `StreamUpdateReceived` | A reactive stream delivers a new data update. |

**Example**

```ts
import { subscriptionPolicyModule } from '@plures/unum/praxis';

registry.registerModule(subscriptionPolicyModule({ requireAuth: true, maxSubscriptions: 50 }));
```

---

### `freshnessModule(config?)`

```ts
function freshnessModule(config?: FreshnessConfig): PraxisModule
```

Create the freshness Praxis module.  Handles staleness detection, refresh
trigger decisions, TTL enforcement, and cache invalidation policies for
reactive data sources.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `config` | `FreshnessConfig \| undefined` | Optional configuration object. |

**`FreshnessConfig`**

| Field | Type | Default | Description |
|---|---|---|---|
| `defaultTtlMs` | `number` | `30_000` | Default time-to-live in milliseconds. |
| `autoRefresh` | `boolean` | `false` | Whether to automatically trigger a refresh when data becomes stale. |
| `invalidateOnWrite` | `boolean` | `true` | Whether to invalidate the cache whenever a write to a path is detected. |

**Returns** `PraxisModule` — a module ready to register with a `PraxisRegistry`.

**Facts emitted**

| Fact | When emitted |
|---|---|
| `DataFresh` | A freshness check determines that data is within its TTL. |
| `DataStale` | A freshness check determines that data has exceeded its TTL. |
| `RefreshTriggered` | The engine decides to trigger a data refresh. |
| `CacheInvalidated` | A write to a path invalidates its cached freshness state. |

**Events handled**

| Event | Description |
|---|---|
| `FreshnessCheckRequested` | Request a freshness evaluation for a path. |
| `DataWritten` | Data is written to a path (triggers cache invalidation when `invalidateOnWrite` is `true`). |
| `RefreshRequested` | Request an explicit manual refresh of data at a path. |

**Example**

```ts
import { freshnessModule } from '@plures/unum/praxis';

registry.registerModule(freshnessModule({ defaultTtlMs: 60_000, autoRefresh: true }));
```
