/**
 * unum - Svelte action bindings for PluresDB
 *
 * This provides a pluresList action for binding PluresDB data to the DOM.
 */

/**
 * Svelte action for handling PluresDB data binding in lists
 * 
 * @example
 * ```svelte
 * <div use:pluresList={{ db: db.get('messages'), callback: updateMessages }}>
 *   <!-- List rendering based on messages array -->
 * </div>
 * ```
 */
export function pluresList(node, params) {
  let unsubscribe = null;
  let dbRef = null;
  let callback = null;
  
  if (!params) return;
  
  if (params.db || params.gun) {
    dbRef = params.db || params.gun; // Support both 'db' and 'gun' for compatibility
  }
  
  if (params.callback && typeof params.callback === 'function') {
    callback = params.callback;
  }
  
  // Initialize subscription
  function init() {
    if (dbRef && typeof dbRef.map === 'function') {
      // Subscribe to changes
      try {
        const dataMap = {};
        
        unsubscribe = dbRef.map().on((data, key) => {
          if (key === '_') return;
          
          // Update data map
          dataMap[key] = data;
          
          // Call callback with all data
          if (callback) {
            callback(dataMap);
          }
        });
      } catch (error) {
        console.error('Error in pluresList subscription:', error);
      }
    }
  }
  
  // Initialize
  init();
  
  // Return action object
  return {
    update(newParams) {
      // Cleanup old subscription
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error cleaning up pluresList subscription:', error);
        }
      }
      
      // Update parameters
      if (newParams.db || newParams.gun) {
        dbRef = newParams.db || newParams.gun;
      }
      
      if (newParams.callback && typeof newParams.callback === 'function') {
        callback = newParams.callback;
      }
      
      // Reinitialize
      init();
    },
    destroy() {
      // Clean up subscription
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error cleaning up pluresList subscription:', error);
        }
      }
    }
  };
}

// Legacy export for backward compatibility
export const gunList = pluresList;