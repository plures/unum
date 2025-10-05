/**
 * GunContext - Centralized Gun.js instance management
 * 
 * This module provides a shared Gun.js instance for the entire application,
 * avoiding multiple initializations across components.
 */
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Store to hold the Gun instance
const gunStore = writable(null);

// Derived stores for common Gun paths
export const todosRef = derived(gunStore, $gun => $gun?.get('todos') || null);
export const messagesRef = derived(gunStore, $gun => $gun?.get('messages') || null);
export const userProfileRef = derived(gunStore, $gun => $gun?.get('userProfile') || null);

// Flag to prevent multiple initializations
let initialized = false;
let initializationAttempts = 0;
const MAX_ATTEMPTS = 10;

/**
 * Load Gun.js from CDN dynamically if not already loaded
 */
function loadGunScript() {
  return new Promise((resolve, reject) => {
    // If Gun is already available, resolve immediately
    if (typeof window !== 'undefined' && window.Gun) {
      return resolve(window.Gun);
    }

    // Check if the script is already in the DOM
    const existingScript = document.querySelector('script[src*="gun.js"]');
    if (existingScript) {
      // Script exists but hasn't loaded yet, wait for it
      existingScript.addEventListener('load', () => {
        if (window.Gun) {
          resolve(window.Gun);
        } else {
          reject(new Error('Gun.js script loaded but Gun is not defined'));
        }
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Gun.js script'));
      });
      return;
    }

    // Create and add the script element
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gun/gun.js';
    script.async = true;
    
    script.addEventListener('load', () => {
      if (window.Gun) {
        resolve(window.Gun);
      } else {
        reject(new Error('Gun.js script loaded but Gun is not defined'));
      }
    });
    
    script.addEventListener('error', () => {
      reject(new Error('Failed to load Gun.js script'));
    });
    
    document.head.appendChild(script);
  });
}

/**
 * Initialize Gun instance if not already done
 * Only runs in the browser
 */
export function initializeGun() {
  if (initialized || !browser) return;
  
  const attemptInitialization = async () => {
    // Only attempt initialization if not already initialized
    if (initialized) return;
    
    if (initializationAttempts >= MAX_ATTEMPTS) {
      console.error('Failed to initialize Gun after multiple attempts');
      return;
    }
    
    initializationAttempts++;
    
    try {
      // Ensure Gun.js is loaded
      await loadGunScript();
      
      if (window.Gun) {
        console.log('Initializing shared Gun instance');
        // Create a single Gun instance for the app with reliable storage
        const gun = new window.Gun({
          localStorage: true,    // Use localStorage adapter
          file: 'svgun-demo',    // Name for stored data
          radisk: true,          // Use RAD to ensure data persistence
          multicast: false,      // No multicast for this demo
          peers: []              // No peers for this demo
        });
        
        // Monitor all changes to the database
        gun.on('put', function(data) {
          console.log('Gun PUT event:', data);
        });
        
        // Store in our Svelte store
        gunStore.set(gun);
        initialized = true;
        
        // Initialize collections if they don't exist
        setTimeout(() => {
          if (initialized && gun) {
            // Initialize todos collection
            gun.get('todos').once((data) => {
              console.log('Checking todos collection:', data);
              
              // Add a test todo if empty
              if (!data || Object.keys(data).filter(k => k !== '_').length === 0) {
                console.log('Initializing empty todos collection');
                
                // Create a test todo item with explicit text field
                const testId = 'test-' + Date.now();
                gun.get('todos').get(testId).put({
                  text: 'Test Todo Item - ' + new Date().toLocaleTimeString(),
                  completed: false,
                  createdAt: Date.now()
                });
                
                console.log('Added test todo with ID:', testId);
              } else {
                // Verify all todo items have a text property
                console.log('Todos collection exists, checking items');
                
                gun.get('todos').map().once((item, id) => {
                  if (id === '_') return;
                  
                  console.log(`Checking todo ${id}:`, item);
                  
                  // If item exists but has no text, add a text property
                  if (item && (!item.text || item.text === '')) {
                    console.log(`Fixing missing text for todo ${id}`);
                    
                    gun.get('todos').get(id).put({
                      ...item,
                      text: `Todo item ${id.substring(0, 6)}`,
                    });
                  }
                });
              }
            });
          }
        }, 500);
      } else if (!initialized) {
        console.warn('Gun.js not available even after loading script. Retrying...');
        // Retry after a delay - only if not initialized yet
        setTimeout(attemptInitialization, 500);
      }
    } catch (error) {
      console.error('Error initializing Gun:', error);
      // Retry after a delay - only if not initialized yet
      if (!initialized) {
        setTimeout(attemptInitialization, 500);
      }
    }
  };
  
  // Start the initialization process once
  attemptInitialization();
  
  return () => {
    console.log('Cleaning up Gun instance');
    // Gun doesn't have a formal cleanup method, but we can clear our reference
    gunStore.set(null);
    initialized = false;
    initializationAttempts = 0;
  };
}

// Export the gun store for components to subscribe to
export const gun = gunStore; 