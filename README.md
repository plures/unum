# unum

A modern Svelte binding library for PluresDB with full Svelte 5 compatibility.

## Features

- **Svelte 4 & 5 Compatible**: Works with both store-based and runes-based reactivity
- **Type-Safe**: Full TypeScript support with proper types
- **Action-Based**: Modern Svelte actions for DOM binding
- **Store-Based**: Writable store implementation for reactive data
- **Collection Support**: Easy handling of PluresDB collections

## Installation

### npm

```bash
npm install unum
```

### Deno

```ts
import { PluresStore } from "https://deno.land/x/unum/mod.ts";
```

## Usage

### Svelte 4 Store-Based API

```svelte
<script>
  import { PluresStore } from 'unum';
  import { GunDB } from 'pluresdb';

  const db = new GunDB();
  
  // Create a reactive store from PluresDB data
  const nameStore = new PluresStore(db.get('profile').get('name'));
  
  // Subscribe to changes
  $: name = $nameStore;
  
  // Update PluresDB data
  function updateName() {
    nameStore.set('New Name');
  }
</script>

<input type="text" bind:value={$nameStore} />
<button on:click={updateName}>Update</button>
```

### Svelte 5 Runes API

```svelte
<script>
  import { usePlures } from 'unum';
  import { GunDB } from 'pluresdb';

  const db = new GunDB();
  
  // Create a reactive state variable from PluresDB data
  const { value: name } = usePlures(db.get('profile').get('name'));
</script>

<input type="text" bind:value={name} />
```

### Action-Based API (Both Svelte 4 & 5)

```svelte
<script>
  import { plures, pluresList } from 'unum';
  import { GunDB } from 'pluresdb';

  const db = new GunDB();
  const users = db.get('users');
</script>

<!-- Simple binding -->
<input type="text" use:plures={db.get('profile').get('name')} />

<!-- List binding with template -->
<ul use:pluresList={users}>
  <li data-plures-template="true">
    <span name="name">User name</span>
    <input type="text" name="email" placeholder="Email" />
  </li>
</ul>
```

## API Reference

### Stores

- `PluresStore<T>(dbChain, options?)`: Create a Svelte store from a PluresDB chain
- `createPluresStore<T>(dbChain, options?)`: Type-safe factory function

### Runes (Svelte 5)

- `usePlures<T>(dbChain, options?)`: Create a reactive state from a PluresDB chain

### Actions

- `plures`: Action for binding PluresDB data to HTML elements
- `pluresList`: Action for handling collections of PluresDB data items

## License

MIT