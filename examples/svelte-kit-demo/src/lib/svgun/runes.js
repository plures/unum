/**
 * SvGun - Svelte 5 Runes API for Gun.js
 * 
 * This module provides a seamless binding between Gun.js and Svelte 5 components
 * using the new Runes reactivity system. Components can work with Gun data without
 * knowing about Gun specifics.
 */
import { derived } from 'svelte/store';
import { gun as gunStore } from './GunContext.js';

/**
 * Creates a reactive connection to a Gun.js path
 * This is the primary API for Svelte 5 components to use Gun data
 * 
 * @example
 * ```svelte
 * <script>
 *   import { gunData } from '$lib/svgun/runes';
 *   
 *   // Create a reactive connection to Gun data
 *   const todos = gunData('todos');
 *   
 *   // Access a specific todo by ID
 *   const todo = gunData('todos', 'specific-id');
 *   
 *   // Create a new todo
 *   function addTodo(text) {
 *     todos.add({ text, completed: false });
 *   }
 *   
 *   // Toggle a todo's completed status
 *   function toggleTodo(id) {
 *     todo.update(id, current => ({ ...current, completed: !current.completed }));
 *   }
 *   
 *   // Delete a todo
 *   function deleteTodo(id) {
 *     todos.remove(id);
 *   }
 * </script>
 * 
 * <!-- Use the data directly in the template -->
 * <ul>
 *   {#each todos.list() as item}
 *     <li>{item.text}</li>
 *   {/each}
 * </ul>
 * ```
 */
export function gunData(path, id = null) {
  let gunPath = path;
  // Using a plain object, not $state since this isn't a .svelte file
  let state = {};
  let listeners = [];
  let gun = null; // Reference to Gun instance
  let unsubscribe = null; // Store unsubscription function
  
  // Notify all listeners when state changes
  function notifyListeners() {
    for (const listener of listeners) {
      listener(state);
    }
  }
  
  // Create the subscription to Gun data
  function initialize() {
    // Unsubscribe from any existing subscription
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    
    // Subscribe to Gun instance
    const storeUnsubscribe = gunStore.subscribe(gunInstance => {
      if (!gunInstance) return;
      
      // Store Gun instance reference
      gun = gunInstance;
      
      // Create reference to the Gun path
      let ref = gun.get(path);
      
      // If an ID is provided, narrow to that specific item
      if (id) {
        ref = ref.get(id);
        
        // Set up subscription to a single item
        const itemUnsubscribe = ref.on((data) => {
          if (data) {
            // Update state
            state = { ...(data || {}) };
            notifyListeners();
          }
        });
        
        // Update unsubscribe function
        unsubscribe = () => {
          ref.off();
          itemUnsubscribe();
          storeUnsubscribe();
        };
      } else {
        // Set up subscription to a collection
        const mapUnsubscribe = ref.map().on((data, key) => {
          if (key === '_') return; // Skip internal Gun keys
          
          if (data === null) {
            // Item was deleted - create a new object to trigger updates
            const newState = { ...state };
            delete newState[key];
            state = newState;
            notifyListeners();
          } else {
            // Item was added or updated 
            state = {
              ...state,
              [key]: { ...(data || {}), id: key, text: data.text || '' }
            };
            notifyListeners();
          }
        });
        
        // Update unsubscribe function
        unsubscribe = () => {
          ref.map().off();
          mapUnsubscribe();
          storeUnsubscribe();
        };
      }
    });
  }
  
  // Start the initialization
  initialize();
  
  // For collections, get an array of items suitable for #each loops
  function list() {
    if (id) return []; // Not applicable for single items
    
    return Object.values(state)
      .filter(item => item && typeof item === 'object')
      .map(item => ({ ...item, text: item.text || '' }));
  }
  
  // Add a new item to a collection
  function add(data) {
    if (!gun || id) return; // Can't add to a single item reference
    
    const itemId = data.id || Date.now().toString();
    const newItem = { 
      ...data,
      text: data.text || ''  // Ensure text is never undefined
    };
    
    // Add to Gun directly
    gun.get(path).get(itemId).put(newItem);
    
    // Also update local state for immediate UI updates
    state = {
      ...state,
      [itemId]: { ...newItem, id: itemId }
    };
    
    notifyListeners();
  }
  
  // Update an item (or the current item if this is a single item reference)
  function update(itemId, updater) {
    if (!gun) return;
    
    if (id) {
      // This is a single item reference
      const updatedData = typeof updater === 'function' 
        ? updater(state) 
        : updater;
      
      gun.get(path).get(id).put(updatedData);
      
      // Update local state immediately
      state = { ...state, ...updatedData };
      notifyListeners();
    } else {
      // This is a collection
      const item = state[itemId];
      if (!item) return;
      
      const updatedData = typeof updater === 'function'
        ? updater(item)
        : updater;
      
      gun.get(path).get(itemId).put(updatedData);
      
      // Update local state immediately
      state = {
        ...state,
        [itemId]: { ...item, ...updatedData }
      };
      
      notifyListeners();
    }
  }
  
  // Remove an item (or all items if this is a collection and no id is provided)
  function remove(itemId = null) {
    if (!gun) return;
    
    if (id) {
      // This is a single item reference - null it out
      gun.get(path).get(id).put(null);
      state = {};
      notifyListeners();
    } else if (itemId) {
      // Remove a specific item from the collection
      gun.get(path).get(itemId).put(null);
      
      // Update local state immediately
      const newState = { ...state };
      delete newState[itemId];
      state = newState;
      notifyListeners();
    }
  }
  
  // Subscribe to changes - this is needed for Svelte components to react
  function subscribe(callback) {
    listeners.push(callback);
    callback(state); // Initial call with current state
    
    // Return unsubscribe function
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }
  
  // Cleanup function
  function destroy() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    listeners = [];
  }
  
  // Return methods and data
  return {
    // Data access
    get state() { return state; },
    get value() { return id ? state : list(); },
    
    // Methods
    list,
    add,
    update,
    remove,
    subscribe,
    destroy
  };
}

/**
 * Creates a derived state from Gun data - allows transforming/filtering Gun data
 * 
 * @example
 * ```svelte
 * <script>
 *   import { gunData, gunDerived } from '$lib/svgun/runes';
 *   
 *   const todos = gunData('todos');
 *   const completedTodos = gunDerived(todos, items => items.filter(item => item.completed));
 * </script>
 * 
 * <h2>Completed Todos</h2>
 * <ul>
 *   {#each completedTodos.value as item}
 *     <li>{item.text}</li>
 *   {/each}
 * </ul>
 * ```
 */
export function gunDerived(gunData, transformer) {
  let $state = []; // Derived state
  
  // Create a computed value that updates when the source data changes
  function compute() {
    const sourceData = gunData.list ? gunData.list() : gunData.value;
    $state = transformer(sourceData);
  }
  
  // Initial computation
  compute();
  
  // Set up a watcher to recompute when source data changes
  // This would be cleaner with Svelte 5's createEffect, but for now we'll use a workaround
  let previousSourceData = JSON.stringify(gunData.list ? gunData.list() : gunData.value);
  
  // Check periodically for changes (not ideal, but works until Svelte 5 effects are stable)
  const interval = setInterval(() => {
    const currentSourceData = JSON.stringify(gunData.list ? gunData.list() : gunData.value);
    if (previousSourceData !== currentSourceData) {
      previousSourceData = currentSourceData;
      compute();
    }
  }, 100);
  
  // Return reactive state and methods
  return {
    get value() { return $state; },
    destroy() {
      clearInterval(interval);
      if (gunData.destroy) gunData.destroy();
    }
  };
}

/**
 * Creates a two-way binding between a form input and Gun data
 * 
 * @example
 * ```svelte
 * <script>
 *   import { gunBind } from '$lib/svgun/runes';
 *   
 *   const userProfile = gunData('userProfile');
 *   const nameBinding = gunBind(userProfile, 'name');
 * </script>
 * 
 * <input type="text" bind:value={nameBinding.value} />
 * ```
 */
export function gunBind(gunData, field) {
  let $value = gunData.state && gunData.state[field] || '';
  
  // Set up a watcher for changes to the Gun data
  let previousData = JSON.stringify(gunData.state);
  
  const interval = setInterval(() => {
    const currentData = JSON.stringify(gunData.state);
    if (previousData !== currentData) {
      previousData = currentData;
      $value = gunData.state && gunData.state[field] || '';
    }
  }, 100);
  
  return {
    get value() { return $value; },
    set value(newValue) {
      $value = newValue;
      
      // Update the Gun data
      if (gunData.update) {
        gunData.update({ [field]: newValue });
      }
    },
    destroy() {
      clearInterval(interval);
    }
  };
} 