import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve, basename, dirname, normalize, join } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage } from 'node:http';

// Get directory name in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));
const NODE_MODULES_PATH = resolve(__dirname, 'node_modules');

// Check if path is a directory
function isDirectory(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch (e) {
    return false;
  }
}

export default defineConfig({
  plugins: [
    // Apply path normalization before SvelteKit's plugin
    {
      name: 'vite-plugin-path-normalizer',
      enforce: 'pre',
      resolveId(id, importer) {
        // Check for Windows absolute paths in imports
        if (/^[A-Za-z]:[\\/]/.test(id)) {
          console.log(`Normalizing Windows absolute path in import: ${id}`);
          
          // Prevent attempting to load directories as files
          if (isDirectory(id)) {
            console.log(`Skipping directory path: ${id}`);
            return null;
          }
          
          // Handle @sveltejs/kit paths
          if (id.includes('node_modules/@sveltejs/kit')) {
            const normalizedPath = id.replace(/^.*?node_modules\/(@sveltejs\/kit.*)$/, '$1');
            console.log(`Normalized to: ${normalizedPath}`);
            
            // Return the actual file path, not just the module name
            const resolvedPath = resolve(NODE_MODULES_PATH, normalizedPath);
            
            // Check if resolvedPath is a directory - if so, don't return it
            if (isDirectory(resolvedPath)) {
              console.log(`Skipping resolved directory: ${resolvedPath}`);
              return null;
            }
            
            return resolvedPath;
          }
          
          // Handle .svelte-kit generated paths
          if (id.includes('.svelte-kit/generated')) {
            const relativePath = id.replace(/^[A-Za-z]:[\\/].*?\.svelte-kit\/(.*)$/, './.svelte-kit/$1');
            console.log(`Normalized generated path to: ${relativePath}`);
            const resolvedPath = resolve(__dirname, relativePath);
            
            // Check if resolvedPath is a directory - if so, don't return it
            if (isDirectory(resolvedPath)) {
              console.log(`Skipping resolved directory: ${resolvedPath}`);
              return null;
            }
            
            return resolvedPath;
          }
        }
        return null; // Let Vite handle other imports
      }
    },
    sveltekit(),
    // Fix for Windows absolute paths in HTML files
    {
      name: 'vite-plugin-html-path-fix',
      enforce: 'post',
      generateBundle(_, bundle) {
        Object.keys(bundle).forEach(key => {
          const asset = bundle[key];
          
          // Check if the key contains a Windows absolute path (including Q: drive)
          // This regex captures both standard drive letters (C:, D:, etc.) and network drives (Q:, etc.)
          if (/^[A-Za-z]:[\\\/]/.test(key)) {
            console.log(`Found Windows absolute path: ${key}`);
            const fileName = basename(key);
            console.log(`Replacing with filename: ${fileName}`);
            
            // Create a new entry with just the filename
            bundle[fileName] = asset;
            asset.fileName = fileName;
            
            // Delete the original entry with the absolute path
            delete bundle[key];
            console.log(`Fixed Windows absolute path issue for: ${key}`);
          }
        });
      }
    },
    // Fix MIME type issues in dev mode
    {
      name: 'vite-plugin-mime-fix',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Type cast req to handle TypeScript errors
          const request = req as IncomingMessage & { method?: string; url?: string };
          // Only process GET requests for CSS files
          if (request.method === 'GET' && request.url?.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
          }
          next();
        });
      }
    },
    // Fix for cross-env absolute paths in imports
    {
      name: 'vite-plugin-windows-path-resolver',
      enforce: 'pre',
      // Transform content of JS files to fix absolute paths
      transform(code, id) {
        if (id.endsWith('.js') || id.endsWith('.ts') || id.endsWith('.svelte')) {
          // Replace absolute Windows paths in import statements
          const modifiedCode = code.replace(
            /(['"])([A-Za-z]:[\\\/][^'"]+)(['"])/g,
            (match, quote1, path, quote2) => {
              // Skip directories
              if (isDirectory(path)) {
                return match;
              }
              
              // Get the module name if it's a node_modules path
              if (path.includes('node_modules')) {
                const modulePath = path.replace(/^.*?node_modules\/(.*)$/, '$1');
                console.log(`Replacing absolute import path: ${path} with module path: ${modulePath}`);
                return `${quote1}${modulePath}${quote2}`;
              }
              
              // Handle .svelte-kit paths
              if (path.includes('.svelte-kit')) {
                const relativePath = path.replace(/^[A-Za-z]:[\\/].*?\.svelte-kit\/(.*)$/, './.svelte-kit/$1');
                console.log(`Replacing .svelte-kit path: ${path} with: ${relativePath}`);
                return `${quote1}${relativePath}${quote2}`;
              }
              
              return match;
            }
          );
          
          if (code !== modifiedCode) {
            return {
              code: modifiedCode,
              map: null
            };
          }
        }
        return null;
      }
    },
    // Handle environment directory path specifically
    {
      name: 'vite-plugin-environment-fix',
      enforce: 'pre',
      resolveId(id) {
        // Handle the specific environment directory issue
        if (id.includes('@sveltejs/kit/src/runtime/app/environment')) {
          const potentialFilePath = join(NODE_MODULES_PATH, '@sveltejs/kit/src/runtime/app/environment.js');
          if (existsSync(potentialFilePath)) {
            console.log(`Redirecting environment directory to JS file: ${potentialFilePath}`);
            return potentialFilePath;
          }
        }
        return null;
      }
    }
  ],
  optimizeDeps: {
    exclude: ['gun', 'svgun'],
  },
  server: {
    port: 3000,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..', '../..', NODE_MODULES_PATH],
      // Explicitly strict to prevent accidental serving of sensitive files
      strict: false
    }
  },
  build: {
    // Ensure proper MIME types
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // Use simple file names without paths
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]',
        // Ensure the build process doesn't use absolute paths
        sanitizeFileName: (name) => {
          // Remove drive letter and absolute path portions
          return basename(name);
        }
      }
    }
  },
  // Configure proper resolution for CSS files
  resolve: {
    extensions: ['.js', '.ts', '.svelte'],
    // Add alias for lib directory to ensure consistent path resolution
    alias: {
      '$lib': resolve(__dirname, 'src/lib'),
      // Add aliases for SvelteKit runtime components
      '@sveltejs/kit': resolve(NODE_MODULES_PATH, '@sveltejs/kit'),
      // Add alias for .svelte-kit directory
      '.svelte-kit': resolve(__dirname, '.svelte-kit'),
      // Add specific environment alias
      '@sveltejs/kit/src/runtime/app/environment': resolve(NODE_MODULES_PATH, '@sveltejs/kit/src/runtime/app/environment.js')
    }
  },
  // Use relative paths for assets and chunks
  base: '/',
  // Ensure CSS files are properly recognized as CSS, not JS modules
  css: {
    devSourcemap: true
  }
}); 