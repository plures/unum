# unum Validation Checklist

## Package Rename and Configuration
- [x] Rename package from "svgun" to "unum" in package.json
- [x] Rename package from "svgun" to "unum" in deno.json
- [x] Update workspace file name from "svgun-lib.code-workspace" to "unum.code-workspace"
- [x] Update GitHub repository information in package.json
- [x] Update version to "0.1.0" (initial release)

## Documentation
- [x] Update README.md with new package name
- [x] Ensure documentation reflects actual API
- [x] Add installation instructions for both npm and Deno

## Source Code
- [x] Update all references from "svGun-lib" to "unum" in comments and code
- [x] Ensure consistent exports between npm and Deno versions
- [x] Clean up any unused files or test code
- [x] Update import statements to reflect new package name

## Build System
- [x] Verify TypeScript configuration works for both npm and Deno
- [x] Update build scripts for dual-target publishing
- [x] Verify dist folder structure is correct

## Testing
- [x] Run all tests to ensure functionality works
- [x] Verify examples work with new package name
- [x] Create a test run checklist for pre-publish verification

## Publishing
- [x] Prepare npm publishing configuration
- [x] Prepare Deno publishing configuration
- [x] Set up proper version tags for first release

## Final Verification
- [x] Test installation from both npm and Deno
- [x] Verify the package works in a sample Svelte project
- [x] Make sure LICENSE file is included in the package 

## Examples
- [x] Maintain existing Svelte Kit example
- [x] Create Deno-specific example
- [x] Test examples in respective environments
- [x] Document required permissions for Deno example
- [x] Provide alternative import methods for development 

## Deno Demo Implementation
- [x] Create basic Deno demo structure with server.ts and gun-server.ts
- [x] Implement client-side components showcasing unum features
- [x] Resolve module resolution issues for browser imports
- [x] Create import map for browser module resolution
- [x] Add local implementation for unum functionality
- [x] Configure server to serve files from the dist directory
- [x] Make Gun globally available via globalThis.gun
- [x] Implement counter example demonstrating black-box serialization
- [x] Implement todo app example demonstrating black-box binding
- [x] Add UI elements explaining library benefits and features
- [x] Configure server on port 8000 and Gun server on port 8765
- [x] Test and verify demo functionality
- [x] Document demo setup and usage in README.md 

## Bug Fixes for Deno Demo
- [x] Fix import of $derived which isn't exported by the Svelte module
- [x] Fix the module import path for unum in main.js
- [x] Fix window reference with globalThis for Deno compatibility
- [ ] Test and verify the demo works without console errors
- [ ] Verify the counter and todo list components function correctly
- [ ] Ensure Gun.js data persistence works between sessions 

## Deno-SvelteKit Demo Alignment
- [x] Review SvelteKit demo structure and components
- [x] Ensure the demo follows the exact same API usage patterns as SvelteKit
- [x] Verify the demo uses the same black-box serialization approach for components
- [x] Validate the demo uses the same component, handle, and handler patterns
- [x] Fix any Deno-specific compatibility issues with minimal changes

## Priority Fixes
- [x] Update main.js to correctly use globalThis instead of window
- [x] Ensure imports match the SvelteKit demo's pattern
- [x] Fix any Svelte version compatibility issues
- [x] Update the import map to include correct paths
- [ ] Test the demo with the Gun.js server and verify functionality

## Test Procedure
1. Build the library: `npm run build` or `deno task build`
2. Navigate to the Deno demo directory: `cd examples/deno-svelte-demo`
3. Start the demo server: `deno task start`
4. Open a browser and navigate to http://localhost:8000
5. Verify the Counter component works:
   - Counter increments and decrements properly
   - Counter state persists after page reload
6. Verify the Todo List component works:
   - Can add new todo items
   - Can toggle todo items as complete
   - Can delete todo items
   - Todo list state persists after page reload
7. Verify multiple browser windows can sync data through Gun.js 