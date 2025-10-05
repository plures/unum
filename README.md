# unum

A modern Svelte binding library for Gun.js with full Svelte 5 compatibility.

## Features

- **Svelte 4 & 5 Compatible**: Works with both store-based and runes-based reactivity
- **Type-Safe**: Full TypeScript support with proper types
- **Action-Based**: Modern Svelte actions for DOM binding
- **Store-Based**: Writable store implementation for reactive data
- **Collection Support**: Easy handling of Gun collections

## Installation

### npm

```bash
npm install unum
```

### Deno

```ts
import { GunStore } from "https://deno.land/x/unum/mod.ts";
```

## Usage

### Svelte 4 Store-Based API

```svelte
<script>
  import { GunStore } from 'unum';
  import Gun from 'gun';

  const gun = new Gun();
  
  // Create a reactive store from Gun data
  const nameStore = new GunStore(gun.get('profile').get('name'));
  
  // Subscribe to changes
  $: name = $nameStore;
  
  // Update Gun data
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
  import { useGun } from 'unum';
  import Gun from 'gun';

  const gun = new Gun();
  
  // Create a reactive state variable from Gun data
  const { value: name } = useGun(gun.get('profile').get('name'));
</script>

<input type="text" bind:value={name} />
```

### Action-Based API (Both Svelte 4 & 5)

```svelte
<script>
  import { gun, gunList } from 'unum';
  import Gun from 'gun';

  const gun = new Gun();
  const users = gun.get('users');
</script>

<!-- Simple binding -->
<input type="text" use:gun={gun.get('profile').get('name')} />

<!-- List binding with template -->
<ul use:gunList={users}>
  <li data-gun-template="true">
    <span name="name">User name</span>
    <input type="text" name="email" placeholder="Email" />
  </li>
</ul>
```

## API Reference

### Stores

- `GunStore<T>(gunChain, options?)`: Create a Svelte store from a Gun chain
- `createGunStore<T>(gunChain, options?)`: Type-safe factory function

### Runes (Svelte 5)

- `useGun<T>(gunChain, options?)`: Create a reactive state from a Gun chain

### Actions

- `gun`: Action for binding Gun data to HTML elements
- `gunList`: Action for handling collections of Gun data items

## License

MIT