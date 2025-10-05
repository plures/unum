// Simple implementation of unum functionality for the demo
import { $state } from 'svelte';

/**
 * Create a Gun-backed component with reactive bindings
 * @param {string} path - Path to store the component at in Gun
 * @param {any} defaultData - Default data for the component
 * @returns {[any, Function]} A tuple with component data and update function
 */
export function component(path, defaultData) {
  // Import Gun from the global scope (it should be loaded separately)
  if (typeof globalThis === 'undefined' || !globalThis.gun) {
    console.error('Gun is not available globally as globalThis.gun');
    return [defaultData, () => {}];
  }
  
  const gun = globalThis.gun;
  
  // Create a reactive variable to hold the data
  let data = $state(defaultData || {});
  
  // Create a Gun reference to the data
  const gunRef = gun.get('component_' + path);
  
  // Subscribe to Gun updates
  gunRef.on((value) => {
    if (value) {
      // Update the reactive variable with the new data
      data = {...value};
    }
  });
  
  // Initialize Gun with default data if needed
  gunRef.once((value) => {
    if (!value || Object.keys(value).length === 0) {
      gunRef.put(defaultData);
    }
  });
  
  // Function to update the data
  function updateComponent(newData) {
    gunRef.put(newData);
  }
  
  // Return the reactive variable and update function
  return [data, updateComponent];
}

/**
 * Create a handler for a specific property update
 * @param {any} data - Component data
 * @param {Function} updateFn - Component update function
 * @param {string} propName - Property name to handle
 * @returns {Function} Handler function that updates the specific property
 */
export function handle(data, updateFn, propName) {
  return function(newValue) {
    const updatedData = {...data, [propName]: newValue};
    updateFn(updatedData);
  };
}

/**
 * Create a handler object with various update methods
 * @param {any} data - Component data
 * @param {Function} updateFn - Component update function
 * @returns {Object} Handler object with methods for different update patterns
 */
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