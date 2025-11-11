/**
 * unum - Store implementation for Svelte support
 *
 * This provides a writable store implementation for PluresDB data.
 */
import { writable } from 'svelte/store';

/**
 * A Svelte-compatible store for PluresDB data
 * This provides a reactive interface between PluresDB and Svelte
 */
export class PluresStore {
  constructor(db, options = {}) {
    this.db = db;
    this.store = writable(options.initialValue);
    this.setupDbSubscription();
  }

  setupDbSubscription() {
    if (!this.db || typeof this.db.on !== 'function') {
      console.error('Invalid PluresDB instance provided to PluresStore');
      return;
    }

    try {
      // First, check if we can get a snapshot of the current data
      this.db.once((data) => {
        console.log('PluresDB.once initial data snapshot:', data);
        if (data) {
          // Ensure the data has text properties where needed
          this.ensureTextProperties(data);
          // Initialize the store with existing data
          this.store.set(data);
        } else {
          // If no data exists, set an empty object
          console.log('No initial data, setting empty object');
          this.store.set({});
        }
      });

      // Then subscribe to ongoing updates
      this.unsubscribe = this.db.on((data, key) => {
        try {
          console.log('PluresDB.on received data:', data, 'with key:', key);
          
          if (data === null) {
            console.log('Received null data, setting store to empty object');
            this.store.set({});
          } else {
            console.log('Setting store with data:', data);
            // Ensure the data has text properties where needed
            this.ensureTextProperties(data);
            // Simple, clean update - let Svelte handle the reactivity
            this.store.set(data);
          }
        } catch (error) {
          console.error('Error updating store with PluresDB data:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up PluresDB subscription:', error);
    }
  }

  // Helper method to ensure text properties exist
  ensureTextProperties(data) {
    if (!data || typeof data !== 'object') return data;
    
    // Process all non-underscore properties
    Object.keys(data).forEach(key => {
      if (key === '_') return; // Skip PluresDB metadata
      
      const item = data[key];
      if (item && typeof item === 'object') {
        // If the item exists but has no text property, add one
        if (!item.text || typeof item.text !== 'string') {
          console.log(`Adding missing text property to item ${key}`);
          data[key] = {
            ...item,
            text: `Item ${key.substring(0, 6)}`
          };
        }
      }
    });
    
    return data;
  }

  subscribe(run) {
    return this.store.subscribe(run);
  }

  set(value) {
    if (!this.db || typeof this.db.put !== 'function') {
      console.error('Cannot set data on invalid PluresDB instance');
      return;
    }

    try {
      console.log('PluresStore.set called with value:', value);
      
      // Update PluresDB - this will trigger the .on() callback above
      this.db.put(value);
      
      // Also update the store directly for immediate UI feedback
      this.store.set(value);
    } catch (error) {
      console.error('Error setting PluresDB data:', error);
    }
  }

  update(updater) {
    if (!this.db || typeof this.db.put !== 'function') {
      console.error('Cannot update data on invalid PluresDB instance');
      return;
    }

    try {
      this.store.update((currentValue) => {
        if (currentValue === undefined) {
          console.warn('Updating undefined PluresDB value');
          const newValue = updater({});
          this.db.put(newValue);
          return newValue;
        }
        const newValue = updater(currentValue);
        this.db.put(newValue);
        return newValue;
      });
    } catch (error) {
      console.error('Error updating PluresDB data:', error);
    }
  }

  destroy() {
    if (this.unsubscribe) {
      try {
        this.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from PluresDB:', error);
      }
    }
  }
}

/**
 * Creates a PluresStore with proper error handling
 */
export function createPluresStore(db, options = {}) {
  if (!db) {
    console.error('No PluresDB instance provided to createPluresStore');
    // Return a dummy store that won't crash
    return new PluresStore({
      on: () => () => {},
      put: () => {},
    }, options);
  }
  return new PluresStore(db, options);
}

// Legacy exports for backward compatibility
export const GunStore = PluresStore;
export const createGunStore = createPluresStore;