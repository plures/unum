/**
 * SvGun - Store implementation for Svelte support
 *
 * This provides a writable store implementation for Gun data.
 */
import { writable } from 'svelte/store';

/**
 * A Svelte-compatible store for Gun data
 * This provides a reactive interface between Gun.js and Svelte
 */
export class GunStore {
  constructor(gun, options = {}) {
    this.gun = gun;
    this.store = writable(options.initialValue);
    this.setupGunSubscription();
  }

  setupGunSubscription() {
    if (!this.gun || typeof this.gun.on !== 'function') {
      console.error('Invalid Gun instance provided to GunStore');
      return;
    }

    try {
      // First, check if we can get a snapshot of the current data
      this.gun.once((data) => {
        console.log('Gun.once initial data snapshot:', data);
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
      this.unsubscribe = this.gun.on((data, key) => {
        try {
          console.log('Gun.on received data:', data, 'with key:', key);
          
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
          console.error('Error updating store with Gun data:', error);
        }
      });
    } catch (error) {
      console.error('Error setting up Gun subscription:', error);
    }
  }

  // Helper method to ensure text properties exist
  ensureTextProperties(data) {
    if (!data || typeof data !== 'object') return data;
    
    // Process all non-underscore properties
    Object.keys(data).forEach(key => {
      if (key === '_') return; // Skip Gun metadata
      
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
    if (!this.gun || typeof this.gun.put !== 'function') {
      console.error('Cannot set data on invalid Gun instance');
      return;
    }

    try {
      console.log('GunStore.set called with value:', value);
      
      // Update Gun - this will trigger the .on() callback above
      this.gun.put(value);
      
      // Also update the store directly for immediate UI feedback
      this.store.set(value);
    } catch (error) {
      console.error('Error setting Gun data:', error);
    }
  }

  update(updater) {
    if (!this.gun || typeof this.gun.put !== 'function') {
      console.error('Cannot update data on invalid Gun instance');
      return;
    }

    try {
      this.store.update((currentValue) => {
        if (currentValue === undefined) {
          console.warn('Updating undefined Gun value');
          const newValue = updater({});
          this.gun.put(newValue);
          return newValue;
        }
        const newValue = updater(currentValue);
        this.gun.put(newValue);
        return newValue;
      });
    } catch (error) {
      console.error('Error updating Gun data:', error);
    }
  }

  destroy() {
    if (this.unsubscribe) {
      try {
        this.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from Gun:', error);
      }
    }
  }
}

/**
 * Creates a GunStore with proper error handling
 */
export function createGunStore(gun, options = {}) {
  if (!gun) {
    console.error('No Gun instance provided to createGunStore');
    // Return a dummy store that won't crash
    return new GunStore({
      on: () => () => {},
      put: () => {},
    }, options);
  }
  return new GunStore(gun, options);
} 