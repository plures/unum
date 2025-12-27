# unum Deno Demo

This example demonstrates using `unum` with Deno. It mirrors the SvelteKit demo but uses Deno instead of Node.js.

## About This Demo

This demo showcases:

1. Using unum directly from the dist directory
2. A Deno-compatible implementation of the same features in the SvelteKit demo
3. No copying of unum files (unlike the SvelteKit demo which uses a local copy in lib/svgun)

This demo includes the same components as the SvelteKit demo:
- Counter Component
- Todo List Component
- Black-Box Component Serialization

## Requirements

- [Deno](https://deno.land/) (version 1.36 or newer)

## Running the Example

1. Make sure you're in the `examples/deno-svelte-demo` directory
2. Run the server with:

```bash
deno task start
```

3. Open [http://localhost:8000](http://localhost:8000) in your browser

## Required Permissions

This example needs several permissions to run properly:

- `--allow-net`: To serve HTTP and PluresDB traffic
- `--allow-read`: To read static files
- `--allow-write`: For PluresDB data persistence
- `--allow-env`: Required by some PluresDB dependencies
- `--unstable-ffi`: Required by some PluresDB native dependencies
- `--allow-sys`: Required for system information by PluresDB

## How It Compares to the SvelteKit Demo

This demo implements the same functionality as the SvelteKit demo, but with these differences:

1. **Server Implementation**: Uses Deno's built-in HTTP server instead of SvelteKit
2. **Component Creation**: Hand-crafted DOM components instead of Svelte components
3. **Library Access**: Imports directly from the dist directory instead of copying files
4. **Runtime**: Runs on Deno instead of Node.js

The core features remain the same:
- PluresDB (from the pluresdb npm package) for data persistence and synchronization
- Svelte 5 runes for reactivity
- Black-box component serialization patterns