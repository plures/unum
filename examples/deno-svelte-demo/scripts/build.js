/**
 * Simple build script for the Deno Svelte demo
 * This script:
 * 1. Copies necessary dist files to a local directory
 * 2. Ensures all import paths are correctly set up
 */

import { join, dirname } from "https://deno.land/std@0.188.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.188.0/fs/ensure_dir.ts";
import { copy } from "https://deno.land/std@0.188.0/fs/copy.ts";

console.log("Building Deno Svelte Demo...");

// Get the current directory and paths
const currentDir = Deno.cwd();
const demoDir = join(currentDir, "examples", "deno-svelte-demo");
const assetsDir = join(demoDir, "assets");
const libDir = join(assetsDir, "lib");

// Create directory for local library files
await ensureDir(libDir);

// Create a local copy of useful files
const svgunJs = `
// Local implementation of unum for the demo
// This is a simplified version that works in the browser

// Simple component function for creating Gun-backed reactive data
export function component(path, defaultData) {
  // Create a reactive variable to hold the data
  let data = {};
  
  // Create a Gun reference to the data (to be initialized by the caller)
  let gunRef;
  
  // Function to initialize with the Gun instance
  function init(gunInstance) {
    gunRef = gunInstance.get('component_' + path);
    
    // Subscribe to Gun updates
    gunRef.on((value) => {
      if (value) {
        // Update the data with the new values
        data = {...value};
      }
    });
    
    // Initialize Gun with default data if needed
    gunRef.once((value) => {
      if (!value || Object.keys(value).length === 0) {
        gunRef.put(defaultData);
      }
    });
  }
  
  // Initialize when Gun is globally available
  if (typeof globalThis !== 'undefined' && globalThis.gun) {
    init(globalThis.gun);
  } else {
    // Wait for Gun to be available
    setTimeout(() => {
      if (typeof globalThis !== 'undefined' && globalThis.gun) {
        init(globalThis.gun);
      }
    }, 100);
  }
  
  // Function to update the data
  function updateComponent(newData) {
    if (gunRef) {
      gunRef.put(newData);
    }
  }
  
  // Return the data and update function
  return [data, updateComponent];
}

// Function to create a property-specific handler
export function handle(data, updateFn, propName) {
  return function(newValue) {
    const updatedData = {...data, [propName]: newValue};
    updateFn(updatedData);
  };
}

// Function to create a handler with more options
export function handler(data, updateFn) {
  return {
    // Create a handler that only updates a specific property
    prop: (propName) => (newValue) => {
      const updatedData = {...data, [propName]: newValue};
      updateFn(updatedData);
    },
    
    // Create a handler that automatically extracts values from events
    auto: (propName) => (event) => {
      const value = event.target.value;
      const updatedData = {...data, [propName]: value};
      updateFn(updatedData);
    },
    
    // Create a handler that updates the entire component
    full: (newData) => {
      updateFn(newData);
    }
  };
}
`;

// Write the local implementation file
await Deno.writeTextFile(join(libDir, "svgun.js"), svgunJs);

// Update main.js to use the local implementation
const mainJsPath = join(assetsDir, "main.js");
let mainJs = await Deno.readTextFile(mainJsPath);

// Replace the imports
mainJs = mainJs.replace(
  "import { component, handle, handler } from '../../dist/index.js';",
  "import { component, handle, handler } from './lib/svgun.js';"
);

// Replace the functions we defined inline
mainJs = mainJs.replace(
  "// Simple component function for creating Gun-backed reactive data\nfunction createComponent(path, defaultData) {", 
  "// Use the imported functions instead of the local versions\n/* function createComponent(path, defaultData) {"
);

// Find the end of these functions
const endOfCreateComponent = mainJs.indexOf("// Function to create a property-specific handler\nfunction createPropertyHandler");
if (endOfCreateComponent > 0) {
  mainJs = mainJs.slice(0, endOfCreateComponent) + "*/ " + mainJs.slice(endOfCreateComponent);
}

// Replace usage of our local implementation
mainJs = mainJs.replace("createComponent", "component");
mainJs = mainJs.replace("createPropertyHandler", "handle");
mainJs = mainJs.replace("createHandlerObject", "handler");

// Write updated main.js
await Deno.writeTextFile(mainJsPath, mainJs);

// Example of using unum in a script
function exampleUsage() {
  if (typeof globalThis !== 'undefined' && globalThis.gun) {
    init(globalThis.gun);
  }
}

function anotherExample() {
  if (typeof globalThis !== 'undefined' && globalThis.gun) {
    init(globalThis.gun);
  }
}

console.log("Build complete! You can now run 'deno task start'"); 