/**
 * Path Debugger Utility for SvelteKit
 * 
 * This utility helps debug Windows path issues in SvelteKit applications,
 * particularly when using network drives or absolute paths.
 */

/**
 * Logs path related information for debugging
 * 
 * @param {string} path - The path to inspect
 * @param {string} [context='general'] - The context for this path (e.g., 'import', 'route')
 */
export function debugPath(path, context = 'general') {
  console.group(`Path Debug (${context})`);
  console.log('Original path:', path);
  
  // Detect Windows drive letters
  const hasDriveLetter = /^[A-Z]:/i.test(path);
  console.log('Has Windows drive letter:', hasDriveLetter);
  
  // Detect Vite /@fs/ paths
  const isViteFsPath = path.startsWith('/@fs/');
  console.log('Is Vite /@fs/ path:', isViteFsPath);
  
  // Extract drive letter if present
  let driveLetter = null;
  if (hasDriveLetter) {
    driveLetter = path.substring(0, 2);
  } else if (isViteFsPath && /\/@fs\/[A-Z]:/i.test(path)) {
    driveLetter = path.match(/\/@fs\/([A-Z]:)/i)[1];
  }
  console.log('Drive letter:', driveLetter);
  
  // Check if path is absolute
  const isAbsolute = path.startsWith('/') || hasDriveLetter || isViteFsPath;
  console.log('Is absolute path:', isAbsolute);
  
  // Check if path is SvelteKit-specific
  const isSvelteKitPath = path.includes('.svelte-kit/') || path.includes('+page') || path.includes('+layout');
  console.log('Is SvelteKit path:', isSvelteKitPath);
  
  // Check for dynamic imports
  const isDynamicImport = context === 'import' && path.includes('import(');
  console.log('Is dynamic import:', isDynamicImport);
  
  console.groupEnd();
  
  return {
    path,
    hasDriveLetter,
    isViteFsPath,
    driveLetter,
    isAbsolute,
    isSvelteKitPath,
    isDynamicImport
  };
}

/**
 * Suggest a fix for a problematic Windows path in SvelteKit
 * 
 * @param {string} path - The path to fix
 * @returns {string} The suggested fixed path
 */
export function suggestPathFix(path) {
  const pathInfo = debugPath(path, 'fix-suggestion');
  
  // If it's a Windows path with drive letter
  if (pathInfo.hasDriveLetter || pathInfo.isViteFsPath) {
    const cleanPath = path.replace(/^\/@fs\//, '');
    const driveLetter = pathInfo.driveLetter || cleanPath.substring(0, 2);
    const pathPart = cleanPath.substring(driveLetter.length);
    
    // Use the tabbed approach
    return `../tab-${driveLetter.charAt(0)}-path${pathPart.replace(/\\/g, '/')}`;
  }
  
  // If it's a SvelteKit route path
  if (pathInfo.isSvelteKitPath) {
    if (path.includes('.svelte-kit/generated/client/nodes/')) {
      const nodeMatch = path.match(/nodes\/(\d+)\.js/);
      if (nodeMatch) {
        return `virtual:svelte-kit-node-${nodeMatch[1]}`;
      }
    }
  }
  
  return path;
}

/**
 * Creates a wrapper around console to log path-related debug info
 * Enable by adding ?debug=paths to the URL
 */
export function installPathDebugger() {
  // Only enable if ?debug=paths is in the URL
  if (typeof window !== 'undefined' && window.location.search.includes('debug=paths')) {
    const originalFetch = window.fetch;
    
    // Wrap fetch to debug network requests
    window.fetch = function(url, options) {
      if (typeof url === 'string') {
        debugPath(url, 'fetch');
      }
      return originalFetch.apply(this, arguments);
    };
    
    console.log('🔍 Path Debugger installed - add ?debug=paths to URL to enable logging');
    
    // Add a global helper
    window.debugPath = debugPath;
    window.suggestPathFix = suggestPathFix;
    
    return true;
  }
  
  return false;
}

// Auto-install in dev mode
if (import.meta.env?.DEV) {
  installPathDebugger();
} 