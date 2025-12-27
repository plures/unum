/**
 * unum - Local Svelte PluresDB Bindings
 *
 * A reactive Svelte binding library for PluresDB (@plures/pluresdb).
 */

// Export store implementation
export * from './store.js';

// Export actions
export * from './actions.js';

// Export PluresDB helpers
export * from './plures-helper.js';

// Also export from gun-helper for backward compatibility
export * from './plures-helper.js';

/**
 * Re-export unum and connect functions for easier imports
 */
import { unum, connect } from './unum.js';
import { gun } from './GunContext.js';

export { unum, connect, gun };
export { gun as db, gun as plures }; // Alternative export names

/**
 * Creates a complete PluresDB-powered component with automatic synchronization
 * 
 * This higher-level function creates a wrapped component that automatically
 * syncs with PluresDB (from the 'pluresdb' npm package), without requiring any knowledge of 
 * the component's props structure. Just specify the component and path, and 
 * it handles the rest.
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.component - The component to bind with PluresDB data
 * @param {Object} options.db - PluresDB instance from 'pluresdb' package (can also use 'gun' for compatibility)
 * @param {string} options.path - PluresDB path for data storage
 * @param {string} [options.id] - Optional ID for multiple instances of the same component
 * @param {Object} [options.defaultData] - Default data to use ONLY if no data exists yet
 * @param {Object} [options.props] - Additional props to pass to the component (not synced with PluresDB)
 * @returns {Function} A self-contained component that handles the synchronization
 */
export function pluresComponent(options) {
  const { component, db, gun, path, id, defaultData = {}, props: extraProps = {} } = options;
  const dbInstance = db || gun; // Support both 'db' and 'gun' for compatibility
  
  if (!component) {
    console.error('Component is required for pluresComponent');
    return () => null;
  }
  
  if (!dbInstance) {
    console.error('PluresDB instance from the pluresdb package is required for pluresComponent');
    return () => null;
  }
  
  if (!path) {
    console.error('Path is required for pluresComponent');
    return () => null;
  }
  
  // The full path including optional ID
  const fullPath = id ? `${path}_${id}` : path;
  
  // Return a dynamically created component constructor
  return class PluresComponentWrapper {
    constructor(options = {}) {
      this.options = options;
      this.Component = component;
      this.instance = null;
      this.isMounted = false;
      this.dbNode = dbInstance.get(fullPath);
      this.proxyData = null;
      this.unsubscribe = null;
      this.isUpdatingFromDb = false; // Flag to prevent circular updates
      this.lastSnapshot = JSON.stringify({}); // Used to track changes
      
      // Initialize data if empty
      this.dbNode.once(data => {
        if (!data || Object.keys(data).filter(k => k !== '_').length === 0) {
          // Only apply default data if empty
          if (defaultData && Object.keys(defaultData).length > 0) {
            this.dbNode.put(defaultData);
          }
        }
      });
      
      // Create reactive proxy
      this.proxyData = this.createReactiveProxy();
    }
    
    // Create a proxy that automatically syncs with PluresDB
    createReactiveProxy() {
      // Initial state
      const state = { ...defaultData };
      
      // Create proxy
      const proxy = new Proxy(state, {
        get: (target, prop) => {
          return target[prop];
        },
        set: (target, prop, value) => {
          // Set value in state
          target[prop] = value;
          
          // Only update PluresDB if not updating from PluresDB
          if (!this.isUpdatingFromDb && this.dbNode) {
            // Update PluresDB
            this.dbNode.get(prop).put(value);
            
            // Handle arrays
            if (Array.isArray(value)) {
              this.wrapArrayMethods(value, prop);
            }
          }
          
          // Update component if mounted
          if (this.isMounted && this.instance) {
            const props = {};
            props[prop] = value;
            this.instance.$set(props);
          }
          
          return true;
        },
        deleteProperty: (target, prop) => {
          delete target[prop];
          
          // Update PluresDB
          if (!this.isUpdatingFromDb && this.dbNode) {
            this.dbNode.get(prop).put(null);
          }
          
          return true;
        }
      });
      
      return proxy;
    }
    
    // Wrap array methods to detect changes
    wrapArrayMethods(array, propPath) {
      ['push', 'pop', 'shift', 'unshift', 'splice', 'reverse', 'sort'].forEach(method => {
        const original = array[method];
        array[method] = function(...args) {
          // Call original
          const result = original.apply(this, args);
          
          // Update PluresDB with entire array
          if (this.dbNode) {
            this.dbNode.get(propPath).put(array);
          }
          
          return result;
        }.bind(this);
      });
      
      return array;
    }
    
    mount(target) {
      if (!target) {
        console.error('Target element is required for mounting');
        return this;
      }
      
      // Get initial props
      const props = {
        ...this.proxyData,
        ...extraProps,
        ...this.options?.props
      };
      
      // Create the component instance
      this.instance = new this.Component({
        target,
        props
      });
      
      // Mark as mounted
      this.isMounted = true;
      
      // Subscribe to PluresDB updates
      this.unsubscribe = this.dbNode.on((data) => {
        if (!data) return;
        
        // Filter out PluresDB metadata
        const cleanData = {};
        for (const key in data) {
          if (key !== '_' && !key.startsWith('_')) {
            cleanData[key] = data[key];
          }
        }
        
        // Update proxy without triggering PluresDB updates
        this.isUpdatingFromDb = true;
        try {
          // Update all properties
          for (const key in cleanData) {
            // Update proxy
            this.proxyData[key] = cleanData[key];
          }
          
          // Update component if mounted
          if (this.isMounted && this.instance) {
            this.instance.$set(cleanData);
          }
        } finally {
          this.isUpdatingFromDb = false;
        }
      });
      
      return this;
    }
    
    destroy() {
      // Unsubscribe from PluresDB
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
      
      // Destroy component
      if (this.instance && typeof this.instance.$destroy === 'function') {
        this.instance.$destroy();
        this.instance = null;
      }
      
      this.isMounted = false;
    }
  };
}

// Legacy export for backward compatibility
export const gunComponent = pluresComponent; 