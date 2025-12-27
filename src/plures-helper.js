/**
 * unum - PluresDB Helper Utilities
 *
 * This module provides helper functions for working with PluresDB in Svelte.
 * PluresDB is a Gun.js-compatible database available at npm package 'pluresdb'.
 */

/**
 * Get a reference to the PluresDB constructor when loaded from CDN
 */
export function getPlures(options) {
  // First check if PluresDB/Gun was loaded via CDN
  if (typeof window !== 'undefined' && (window.GunDB || window.Gun)) {
    try {
      const DB = window.GunDB || window.Gun;
      return new DB(options);
    } catch (error) {
      console.error('Error initializing PluresDB:', error);
      return null;
    }
  }
  
  console.warn('PluresDB/Gun.js not available. Make sure to include it via CDN script tag or install the pluresdb npm package.');
  return null;
}

/**
 * Checks if PluresDB is available
 */
export function isPluresAvailable() {
  return typeof window !== 'undefined' && (window.GunDB !== undefined || window.Gun !== undefined);
}

/**
 * Helper to safely access PluresDB data with nested properties
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
 * Helper to safely process PluresDB data in a map operation
 */
export function safeMap(dbData, callback, filterFn = null) {
  if (!dbData || typeof dbData !== 'object') {
    return [];
  }
  
  try {
    // Convert to entries and filter out metadata
    let entries = Object.entries(dbData).filter(([key]) => key !== '_');
    
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
    console.error('Error processing PluresDB data:', error);
    return [];
  }
}

/**
 * Create a PluresDB chain with safety checks
 */
export function safeChain(db, path) {
  if (!db) {
    console.error('No PluresDB instance provided');
    return null;
  }
  
  try {
    if (!path) return db;
    
    let chain = db;
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
    console.error(`Error creating PluresDB chain for path ${path}:`, error);
    return null;
  }
}

// Legacy exports for backward compatibility
export const getGun = getPlures;
export const isGunAvailable = isPluresAvailable;