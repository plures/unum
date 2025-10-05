import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
    adapter: adapter(),
    alias: {
      '$lib': resolve('./src/lib')
    },
    // Customize the generated files to avoid absolute path issues
    files: {
      assets: 'static',
      lib: 'src/lib',
      routes: 'src/routes',
      serviceWorker: 'src/service-worker',
      appTemplate: 'src/app.html'
    }
  },
  
  // Enable Svelte 5 runes
  compilerOptions: {
    runes: true
  }
};

export default config; 