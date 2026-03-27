# Unum API

Public API exported from `src/index.ts`.

## Core Context

- `initDb(adapter: DbAdapter): void` — set the active adapter.
- `getAdapter(): DbAdapter` — returns current adapter (throws if not initialized).
- `getRoot(): ChainNode` — shorthand for `getAdapter().root()`.
- `destroyDb(): void` — destroys adapter (if supported) and clears context.
- `db: Readable<DbAdapter | null>` — Svelte-readable store of the current adapter.

## Runes / Reactive Bindings

- `pluresData<T>(path: string, id?: string | null): DataRef<T>`
  - Reactive collection or single-item binding.
- `pluresDerived<T>(source: DataRef, transform: (items: Array<Record<string, unknown> & { id: string }>) => T[]): { value: T[]; destroy(): void }`
  - Derived array view.
- `pluresBind(source: DataRef, field: string): { value: unknown; destroy(): void }`
  - Two-way field binding helper.

## Stores

- `class PluresStore<T>`
  - `constructor(path: string, initialValue?: T)`
  - `subscribe(run: (value: T) => void): Unsubscribe`
  - `set(value: T): void`
  - `update(updater: (current: T) => T): void`
  - `destroy(): void`
- `createPluresStore<T>(path: string, initialValue?: T): PluresStore<T>`

## Graph API

- `useGraph<N, E>(path: string): GraphRef<N, E>`
  - `nodes: GraphNode<N>[]`
  - `edges: GraphEdge<E>[]`
  - `state: GraphState<N, E>`
  - `addNode(data: N & { id?: string }): string`
  - `updateNode(id: string, data: Partial<N>): void`
  - `removeNode(id: string): void`
  - `addEdge(source: string, target: string, data?: E): string`
  - `updateEdge(id: string, data: Partial<E>): void`
  - `removeEdge(id: string): void`
  - `query<T>(selector: (nodes, edges) => T): GraphQuery<T>`
  - `findPath(fromId: string, toId: string): GraphNode<N>[]`
  - `subscribe(cb: (state: GraphState<N, E>) => void): Unsubscribe`
  - `destroy(): void`

## Collections

- `createCollection<T>(path: string): CollectionRef<T>`
  - `items: CollectionItem<T>[]`
  - `size: number`
  - `add(data: Omit<T, 'id'> & { id?: string }): string`
  - `update(id: string, data: Partial<Omit<T, 'id'>>): void`
  - `remove(id: string): void`
  - `get(id: string): CollectionItem<T> | undefined`
  - `query<R>(selector: (items) => R): CollectionQuery<R>`
  - `subscribe(cb: (items) => void): Unsubscribe`
  - `destroy(): void`

## Adapters

- `createPluresDbAdapter(db: PluresDbChainLike): DbAdapter`
- `createMemoryAdapter(): DbAdapter`
- `createGunAdapter(gun: GunChainLike): DbAdapter`
- `createHyperswarmAdapter(swarm: HyperswarmLike, inner: DbAdapter): DbAdapter`

## Utility Helpers

- `isPluresAvailable(adapter: DbAdapter | null | undefined): adapter is DbAdapter`
- `safeGet<T>(obj: unknown, path: string, defaultValue?: T): T | undefined`
- `safeMap<T, R>(dbData: unknown, callback: (key: string, value: T) => R, filterFn?: (key: string, value: T) => boolean): R[]`
- `safeChain(adapter: DbAdapter | null, path?: string): ChainNode | null`

## Types

- `ChainNode`, `DbAdapter`, `DataCallback`, `DataRef`, `PluresDataOptions`, `Unsubscribe`
- `GraphNode`, `GraphEdge`, `GraphState`, `GraphQuery`, `GraphRef`
- `CollectionItem`, `CollectionQuery`, `CollectionRef`
