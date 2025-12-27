/**
 * PluresContext - Centralized PluresDB instance management
 * 
 * This module provides a shared PluresDB instance for the entire application,
 * avoiding multiple initializations across components.
 * 
 * PluresDB is available at @plures/pluresdb on npm.
 */
import { writable, derived } from 'svelte/store';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Store to hold the PluresDB instance
const dbStore = writable(null);

// Derived stores for common PluresDB paths
export const todosRef = derived(dbStore, $db => $db?.get('todos') || null);
export const messagesRef = derived(dbStore, $db => $db?.get('messages') || null);
export const userProfileRef = derived(dbStore, $db => $db?.get('userProfile') || null);

// Flag to prevent multiple initializations
let initialized = false;
let initializationAttempts = 0;
const MAX_ATTEMPTS = 10;

/**
 * Load PluresDB from CDN dynamically if not already loaded
 * Note: For production use, install pluresdb from npm instead of using CDN
 */
function loadPluresScript() {
  return new Promise((resolve, reject) => {
    // If PluresDB is already available, resolve immediately
    // PluresDB can be loaded from pluresdb package
    if (typeof window !== 'undefined' && (window.PluresDB || window.GunDB || window.Gun)) {
      return resolve(window.PluresDB || window.GunDB || window.Gun);
    }

    // Check if the script is already in the DOM
    const existingScript = document.querySelector('script[src*="pluresdb"]') ||
                          document.querySelector('script[src*="gun.js"]');
    if (existingScript) {
      // Script exists but hasn't loaded yet, wait for it
      existingScript.addEventListener('load', () => {
        const DB = window.PluresDB || window.GunDB || window.Gun;
        if (DB) {
          resolve(DB);
        } else {
          reject(new Error('PluresDB script loaded but not defined'));
        }
      });
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load PluresDB script'));
      });
      return;
    }

    // Create and add the script element
    // For production, use: import { GunDB } from 'pluresdb'
    // Using Gun.js CDN as fallback for browser compatibility
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/gun/gun.js';
    script.async = true;
    
    script.addEventListener('load', () => {
      const DB = window.PluresDB || window.GunDB || window.Gun;
      if (DB) {
        resolve(DB);
      } else {
        reject(new Error('PluresDB script loaded but not defined'));
      }
    });
    
    script.addEventListener('error', () => {
      reject(new Error('Failed to load PluresDB script'));
    });
    
    document.head.appendChild(script);
  });
}

/**
 * Initialize PluresDB instance if not already done
 * Only runs in the browser
 */
export function initializePlures() {
  if (initialized || !isBrowser) return;
  
  const attemptInitialization = async () => {
    // Only attempt initialization if not already initialized
    if (initialized) return;
    
    if (initializationAttempts >= MAX_ATTEMPTS) {
      console.error('Failed to initialize PluresDB after multiple attempts');
      return;
    }
    
    initializationAttempts++;
    
    try {
      // Ensure PluresDB is loaded (from @plures/pluresdb package or CDN)
      await loadPluresScript();
      
      const DB = window.PluresDB || window.GunDB || window.Gun;
      if (DB) {
        console.log('Initializing shared PluresDB instance');
        // Create a single DB instance for the app with reliable storage
        const db = new DB({
          localStorage: true,    // Use localStorage adapter
          file: 'unum-demo',    // Name for stored data
          radisk: true,          // Use RAD to ensure data persistence
          multicast: false,      // No multicast for this demo
          peers: ['http://localhost:8765/gun'],
          axe: false            // Disable Axe by default
        });
        
        // Monitor all changes to the database
        db.on('put', function(data) {
          console.log('PluresDB PUT event:', data);
        });
        
        // Store in our Svelte store
        dbStore.set(db);
        initialized = true;
        
        // Initialize collections if they don't exist
        setTimeout(() => {
          if (initialized && db) {
            // Initialize todos collection
            db.get('todos').once((data) => {
              console.log('Checking todos collection:', data);
              
              // Add a test todo if empty
              if (!data || Object.keys(data).filter(k => k !== '_').length === 0) {
                console.log('Initializing empty todos collection');
                
                // Create a test todo item with explicit text field
                const testId = 'test-' + Date.now();
                db.get('todos').get(testId).put({
                  text: 'Test Todo Item - ' + new Date().toLocaleTimeString(),
                  completed: false,
                  createdAt: Date.now()
                });
                
                console.log('Added test todo with ID:', testId);
              } else {
                // Verify all todo items have a text property
                console.log('Todos collection exists, checking items');
                
                db.get('todos').map().once((item, id) => {
                  if (id === '_') return;
                  
                  console.log(`Checking todo ${id}:`, item);
                  
                  // If item exists but has no text, add a text property
                  if (item && (!item.text || item.text === '')) {
                    console.log(`Fixing missing text for todo ${id}`);
                    
                    db.get('todos').get(id).put({
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
        console.warn('PluresDB not available even after loading script. Retrying...');
        // Retry after a delay - only if not initialized yet
        setTimeout(attemptInitialization, 500);
      }
    } catch (error) {
      console.error('Error initializing PluresDB:', error);
      // Retry after a delay - only if not initialized yet
      if (!initialized) {
        setTimeout(attemptInitialization, 500);
      }
    }
  };
  
  // Start the initialization process once
  attemptInitialization();
  
  return () => {
    console.log('Cleaning up PluresDB instance');
    // PluresDB doesn't have a formal cleanup method, but we can clear our reference
    dbStore.set(null);
    initialized = false;
    initializationAttempts = 0;
  };
}

// Export the db store for components to subscribe to
export const plures = dbStore;
export const db = dbStore;

// Legacy export for backward compatibility
export const gun = dbStore;
export const initializeGun = initializePlures;