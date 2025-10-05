/**
 * unum - Gun-powered Component Wrapper
 * 
 * This module provides a higher-level component wrapper that simplifies
 * binding Svelte components to Gun.js data.
 */
import { gun as gunStore } from './GunContext.js';
import { writable, derived, get } from 'svelte/store';
import { createEventDispatcher } from 'svelte';

/**
 * Wraps any Svelte component with Gun.js integration
 * 
 * @param {Component} Component - The Svelte component to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.path - The Gun.js path to store data
 * @param {string} [options.id] - Optional ID for this specific instance
 * @param {Object} [options.defaultData] - Default data to use if Gun has no data
 * @returns {Component} A new component that wraps the original with Gun.js integration
 */
export function gunComponent(Component, { path, id, defaultData = {} }) {
  // Generate unique ID if not provided
  const instanceId = id || `${path}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const gunPath = `${path}/${instanceId}`;
  
  // Create a component that properly works with Svelte 5 runes mode
  return function GunWrappedComponent(props) {
    // Create a store for our props
    const propsStore = writable({ ...defaultData, ...props });
    
    // Flag to prevent circular updates
    let isUpdatingFromGun = false;
    
    // Gun reference and unsubscribe function
    let gunNodeRef = null;
    let gunUnsubscribe = null;
    
    // Last known state for comparison
    let lastKnownState = { ...defaultData, ...props };
    
    // Setup Gun subscription
    let cleanup = null;
    
    // Set up our Gun subscription
    function setup() {
      const unsubGun = gunStore.subscribe($gun => {
        if (!$gun) return;
        
        // Get the Gun node for this component
        const gunNode = $gun.get(gunPath);
        gunNodeRef = gunNode;
        
        // Initialize with default data if empty
        gunNode.once(data => {
          if (!data || Object.keys(data).filter(k => k !== '_').length === 0) {
            // Initialize with combined default and initial props
            const initialData = { ...defaultData, ...props };
            gunNode.put(initialData);
          }
        });
        
        // Subscribe to Gun data changes
        if (gunUnsubscribe) {
          gunUnsubscribe();
        }
        
        // Listen for updates
        gunUnsubscribe = gunNode.on((data) => {
          if (!data) return;
          
          // Filter out Gun metadata
          const cleanData = {};
          for (const key in data) {
            if (key !== '_' && !key.startsWith('_')) {
              cleanData[key] = data[key];
            }
          }
          
          // Prevent circular updates
          if (JSON.stringify(cleanData) !== JSON.stringify(lastKnownState)) {
            isUpdatingFromGun = true;
            
            // Update store
            propsStore.set(cleanData);
            
            // Update last known state
            lastKnownState = { ...cleanData };
            
            // Reset update flag after a tick
            setTimeout(() => {
              isUpdatingFromGun = false;
            }, 0);
          }
        });
      });
      
      // Return cleanup function
      return () => {
        if (gunUnsubscribe) {
          gunUnsubscribe();
          gunUnsubscribe = null;
        }
        
        unsubGun();
      };
    }
    
    // Handle changes from the component
    function handleUpdate(event) {
      if (isUpdatingFromGun) return;
      
      const detail = event?.detail;
      if (!detail) return;
      
      // Update our state
      lastKnownState = { ...lastKnownState, ...detail };
      
      // Update Gun
      if (gunNodeRef) {
        gunNodeRef.put(lastKnownState);
      }
    }
    
    // Update Gun when props change
    function syncToGun() {
      if (isUpdatingFromGun || !gunNodeRef) return;
      
      // Get current props
      const currentProps = get(propsStore);
      
      // Update Gun if different
      if (JSON.stringify(currentProps) !== JSON.stringify(lastKnownState)) {
        lastKnownState = { ...currentProps };
        gunNodeRef.put(currentProps);
      }
    }
    
    // Create our component instance with proper lifecycle hooks
    return {
      // Set up when component is created  
      $$render() {
        // Setup our Gun subscription if needed
        if (!cleanup) {
          cleanup = setup();
        }
        
        // Get derived props
        const $props = get(propsStore);
        
        // Sync to Gun when props change
        syncToGun();
        
        // Render the component with derived props
        return Component.render
          ? Component.render($props, {})  // For Svelte compiler >= 5
          : Component({ ...props, ...$props });
      },
      
      // Set up event handlers
      $$events: {
        update: handleUpdate,
        change: handleUpdate,
        input: handleUpdate,
      },
      
      // Clean up subscriptions when component is destroyed
      $$destroy() {
        if (cleanup) {
          cleanup();
          cleanup = null;
        }
      }
    };
  };
}

/**
 * Creates a Svelte component that wraps another component with Gun.js integration
 * This provides a cleaner API for creating Gun-powered components
 * 
 * @param {Component} Component - The component to wrap
 * @param {string} path - Gun.js path for data storage
 * @param {Object} [options] - Additional options
 * @param {string} [options.id] - Optional ID for this instance
 * @param {Object} [options.defaultData] - Default data to use
 * @returns {Component} A new Svelte component
 * 
 * @example
 * // Create a Gun-powered TodoApp
 * import { wrapWithGun } from '$lib/svgun/gunComponent';
 * import TodoApp from './TodoApp.svelte';
 * 
 * // Simple API - component knows nothing about Gun
 * export const GunTodoApp = wrapWithGun(TodoApp, 'todos', {
 *   defaultData: { items: [] }
 * });
 * 
 * // In a parent component, use it like a normal component
 * <GunTodoApp title="My Todo List" />
 */
export function wrapWithGun(Component, path, options = {}) {
  // Create a properly formatted component wrapper
  const WrappedComponent = function(props) {
    const wrapper = gunComponent(Component, {
      path,
      id: options.id,
      defaultData: options.defaultData || {}
    });
    
    // Create a new instance of the wrapper with the props
    const instance = new wrapper(props);
    
    // Return the instance
    return instance;
  };
  
  // Make it look like a Svelte component
  WrappedComponent.$$render = function($$props, $$slots) {
    const props = $$props || {};
    const instance = new WrappedComponent(props);
    return instance.$$render ? instance.$$render() : '';
  };
  
  // Add other important Svelte component properties
  WrappedComponent.render = function(props, options) {
    const wrapper = gunComponent(Component, {
      path,
      id: options?.id || options.id,
      defaultData: options.defaultData || {}
    });
    
    // For Svelte 5
    const instance = new wrapper(props);
    return instance.$$render ? instance.$$render() : '';
  };
  
  return WrappedComponent;
} 