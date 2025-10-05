/**
 * SvGun - Svelte action bindings for Gun.js
 *
 * This provides a gunList action for binding Gun data to the DOM.
 */

/**
 * Svelte action for handling Gun.js data binding in lists
 * 
 * @example
 * ```svelte
 * <div use:gunList={{ gun: gun.get('messages'), callback: updateMessages }}>
 *   <!-- List rendering based on messages array -->
 * </div>
 * ```
 */
export function gunList(node, params) {
  let unsubscribe = null;
  let gunRef = null;
  let callback = null;
  
  if (!params) return;
  
  if (params.gun) {
    gunRef = params.gun;
  }
  
  if (params.callback && typeof params.callback === 'function') {
    callback = params.callback;
  }
  
  // Initialize subscription
  function init() {
    if (gunRef && typeof gunRef.map === 'function') {
      // Subscribe to changes
      try {
        const dataMap = {};
        
        unsubscribe = gunRef.map().on((data, key) => {
          if (key === '_') return;
          
          // Update data map
          dataMap[key] = data;
          
          // Call callback with all data
          if (callback) {
            callback(dataMap);
          }
        });
      } catch (error) {
        console.error('Error in gunList subscription:', error);
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
          console.error('Error cleaning up gunList subscription:', error);
        }
      }
      
      // Update parameters
      if (newParams.gun) {
        gunRef = newParams.gun;
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
          console.error('Error cleaning up gunList subscription:', error);
        }
      }
    }
  };
} 