/**
 * unum - Component-agnostic Gun.js data binding for Svelte components
 * 
 * This module provides a clean way to bind Gun.js data to Svelte components
 * without the components knowing anything about Gun.js.
 */
import { getContext } from 'svelte';
import { writable, derived } from 'svelte/store';
import { gun as gunStore } from './GunContext.js';

/**
 * Creates a Gun-powered version of any Svelte component
 * 
 * This function takes a component and returns a new function component
 * that automatically binds Gun.js data to the original component's props structure.
 * 
 * @param {Component} Component - The Svelte component to enhance
 * @param {Object} options - Options for the binding
 * @param {string} options.path - Gun.js path for the data
 * @param {string} [options.id] - Optional ID for specific component instance
 * @param {Object} [options.defaultProps] - Default props to use when Gun data is not available
 * @returns {Component} A new component that wraps the original with Gun.js binding
 * 
 * @example
 * // Create a Gun-powered TodoList component
 * import { unum } from '$lib/svgun/unum';
 * import TodoList from './TodoList.svelte';
 * 
 * export const GunTodoList = unum(TodoList, {
 *   path: 'todos',
 *   defaultProps: { items: [] }
 * });
 * 
 * // In a parent component or route
 * <GunTodoList />
 */
export function unum(Component, options) {
  const { path, id, defaultProps = {} } = options;
  
  // Use id if provided, otherwise generate a unique one
  const nodePath = id ? `${path}_${id}` : path;
  
  // Return a new component function (Svelte 5 style)
  return function GunifiedComponent($$props) {
    const props = $$props || {};
    
    // Create a store for the component props
    const propsStore = writable({ ...defaultProps, ...props });
    
    // Subscribe to the Gun instance
    const gunStoreValue = getContext('gun') || gunStore;
    let gun = null;
    let unsubscribe = null;
    
    // Subscribe to Gun updates when the component is created
    const unsubscribeFromGun = gunStoreValue.subscribe($gun => {
      if (!$gun) return;
      gun = $gun;
      
      // Get the Gun node for this component
      const node = gun.get(nodePath);
      
      // Initialize Gun data with default props if empty
      node.once(data => {
        if (!data || Object.keys(data).length === 0) {
          const initialData = { ...defaultProps, ...props };
          node.put(initialData);
        }
      });
      
      // Subscribe to Gun data changes
      unsubscribe = node.on((data) => {
        if (!data) return;
        
        // Filter out Gun metadata
        const cleanData = {};
        for (const k in data) {
          if (k !== '_' && !k.startsWith('_')) {
            cleanData[k] = data[k];
          }
        }
        
        // Update props store
        propsStore.update(current => ({
          ...current,
          ...cleanData
        }));
      });
    });
    
    // Create the derived props for the component
    const derivedProps = derived(propsStore, $props => $props);
    
    // Handle component events
    function handleEvent(event) {
      const { detail } = event;
      
      // If Gun instance is available
      if (gun) {
        const node = gun.get(nodePath);
        if (node && detail) {
          // Update Gun data with event detail
          node.put(detail);
        }
      }
      
      // Also update the local props store
      if (detail) {
        propsStore.update(current => ({
          ...current,
          ...detail
        }));
      }
    }
    
    // Listener for all update events
    function addEventListeners(element) {
      if (element) {
        element.addEventListener('update', handleEvent);
      }
      
      return () => {
        if (element) {
          element.removeEventListener('update', handleEvent);
        }
      };
    }
    
    // Return the wrapped component
    return {
      component: Component,
      props: derivedProps,
      $$slot_def: {},
      events: {
        update: handleEvent
      },
      onMount(instance) {
        if (instance && instance.$$root) {
          // Add event listeners to the component's root element
          return addEventListeners(instance.$$root);
        }
      },
      
      // Clean up when component is destroyed
      destroy() {
        if (unsubscribeFromGun) {
          unsubscribeFromGun();
        }
        
        if (unsubscribe) {
          unsubscribe();
        }
      }
    };
  };
}

/**
 * Universal binding between Gun.js and any component data
 * 
 * This function creates a reactive binding that syncs component data 
 * to Gun.js in a generic way, without caring about the specific structure.
 * 
 * @param {string} path - Gun.js path for the data
 * @param {Object} [options] - Configuration options
 * @param {Object} [options.defaultData={}] - Default data to use when Gun data is not available
 * @returns {Object} A binding object with subscriber, data object, and change handler
 */
export function connect(path, options = {}) {
  const { defaultData = {} } = options;
  
  // Create a reactive store
  const dataStore = writable({ ...defaultData });
  
  // Variable to prevent circular updates
  let isUpdatingFromGun = false;
  let isFirstUpdate = true;
  
  // Use internal reference to track the current data state
  let currentData = { ...defaultData };
  
  // Setup Gun connection
  const unsubscribeFromGun = gunStore.subscribe($gun => {
    if (!$gun) return;
    
    // Get the Gun node
    const node = $gun.get(path);
    
    // Initialize data if empty
    node.once(initialData => {
      if (!initialData || Object.keys(initialData).filter(k => k !== '_').length === 0) {
        // Initialize Gun with default data
        node.put(defaultData);
        
        // Update the store with default data
        dataStore.set(defaultData);
        currentData = { ...defaultData };
      } else {
        // Filter out Gun metadata
        const cleanData = {};
        for (const k in initialData) {
          if (k !== '_' && !k.startsWith('_')) {
            cleanData[k] = initialData[k];
          }
        }
        
        // Update store with existing data
        dataStore.set(cleanData);
        currentData = { ...cleanData };
      }
    });
    
    // Subscribe to Gun data changes
    const unsubscribe = node.on((data) => {
      if (!data) return;
      
      // Filter out Gun metadata
      const cleanData = {};
      for (const k in data) {
        if (k !== '_' && !k.startsWith('_')) {
          cleanData[k] = data[k];
        }
      }
      
      if (isFirstUpdate || JSON.stringify(cleanData) !== JSON.stringify(currentData)) {
        isFirstUpdate = false;
        isUpdatingFromGun = true;
        
        // Update store with clean data
        dataStore.set(cleanData);
        
        // Update our internal reference
        currentData = { ...cleanData };
        
        // Reset flag after update
        setTimeout(() => {
          isUpdatingFromGun = false;
        }, 0);
      }
    });
    
    return function cleanup() {
      unsubscribe();
    };
  });
  
  // Create reactive data object that syncs with Gun
  const data = {};
  
  // Set up a proxy to detect changes to data properties
  const proxy = new Proxy(data, {
    get(target, prop) {
      // Get the latest data from the store
      const storeData = currentData;
      return storeData[prop];
    },
    
    set(target, prop, value) {
      // Skip if we're in the middle of updating from Gun
      if (isUpdatingFromGun) return true;
      
      // Create updated data
      const updatedData = { ...currentData };
      updatedData[prop] = value;
      
      // Update Gun
      gunStore.update($gun => {
        if ($gun) {
          $gun.get(path).put(updatedData);
        }
        return $gun;
      });
      
      // Update our internal reference
      currentData = { ...updatedData };
      
      // Update store
      dataStore.set(updatedData);
      
      return true;
    }
  });
  
  // Generic function to handle any component data changes
  function handleComponentChange(newData) {
    // Skip if we're in the middle of updating from Gun
    if (isUpdatingFromGun) return;
    
    // Safety check for newData
    if (!newData) return;
    
    // Update Gun with the new data
    gunStore.update($gun => {
      if ($gun) {
        $gun.get(path).put(newData);
      }
      return $gun;
    });
    
    // Update our internal reference
    currentData = { ...newData };
    
    // Update store
    dataStore.set(newData);
  }
  
  // Expose methods for updating data
  return {
    data: proxy,
    subscribe: dataStore.subscribe,
    set: handleComponentChange,
    update(updater) {
      // Skip if we're in the middle of updating from Gun
      if (isUpdatingFromGun) return;
      
      // Apply updater to current data
      const updatedData = updater(currentData);
      handleComponentChange(updatedData);
    },
    updateField(field, value) {
      // Skip if we're in the middle of updating from Gun
      if (isUpdatingFromGun) return;
      
      // Update a specific field
      const updatedData = { ...currentData };
      updatedData[field] = value;
      handleComponentChange(updatedData);
    },
    // Universal change handler for any component data
    handleChange: handleComponentChange,
    destroy() {
      unsubscribeFromGun();
    }
  };
} 