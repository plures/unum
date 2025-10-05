/**
 * unum - Gun.js Helper Utilities
 *
 * This module provides helper functions for working with Gun.js in Svelte.
 */

/**
 * Get a reference to the Gun constructor when loaded from CDN
 */
export function getGun(options) {
  // First check if Gun was loaded via CDN
  if (typeof window !== 'undefined' && window.Gun) {
    try {
      return new window.Gun(options);
    } catch (error) {
      console.error('Error initializing Gun from window.Gun:', error);
      return null;
    }
  }
  
  console.warn('Gun.js not available. Make sure to include it via CDN script tag.');
  return null;
}

/**
 * Checks if Gun is available
 */
export function isGunAvailable() {
  return typeof window !== 'undefined' && window.Gun !== undefined;
}

/**
 * Helper to safely access Gun data with nested properties
 */
export function safeGet(obj, path, defaultValue = undefined) {
  if (!obj) return defaultValue;
  
  try {
    const parts = path.split('.');
    let result = obj;
    
    for (const part of parts) {
      if (result === undefined || result === null) {
        return defaultValue;
      }
      result = result[part];
    }
    
    return result === undefined ? defaultValue : result;
  } catch (error) {
    console.error(`Error getting path ${path}:`, error);
    return defaultValue;
  }
}

/**
 * Helper to safely process Gun data in a map operation
 */
export function safeMap(gunData, callback, filterFn = null) {
  if (!gunData || typeof gunData !== 'object') {
    return [];
  }
  
  try {
    // Convert to entries and filter out metadata
    let entries = Object.entries(gunData).filter(([key]) => key !== '_');
    
    // Apply additional filter if provided
    if (filterFn && typeof filterFn === 'function') {
      entries = entries.filter(([key, value]) => filterFn(key, value));
    }
    
    // Map the data
    return entries.map(([key, value]) => {
      try {
        return callback(key, value);
      } catch (error) {
        console.error(`Error processing item ${key}:`, error);
        return null;
      }
    }).filter(item => item !== null);
  } catch (error) {
    console.error('Error processing Gun data:', error);
    return [];
  }
}

/**
 * Create a Gun chain with safety checks
 */
export function safeChain(gun, path) {
  if (!gun) {
    console.error('No Gun instance provided');
    return null;
  }
  
  try {
    if (!path) return gun;
    
    let chain = gun;
    const parts = path.split('.');
    
    for (const part of parts) {
      if (part === '#') {
        chain = chain.map();
      } else {
        chain = chain.get(part);
      }
    }
    
    return chain;
  } catch (error) {
    console.error(`Error creating Gun chain for path ${path}:`, error);
    return null;
  }
} 