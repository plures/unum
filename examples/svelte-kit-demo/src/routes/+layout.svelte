<script>
  import { onMount } from 'svelte';
  import { initializeGun, gun } from '$lib/svgun/GunContext';
  
  // Track Gun initialization status
  let gunInitialized = $state(false);
  
  // Initialize Gun once at the app level and track status
  onMount(() => {
    const cleanup = initializeGun();
    
    // Subscribe to Gun store to detect when initialization is complete
    const unsubscribe = gun.subscribe(($gun) => {
      gunInitialized = !!$gun;
      if ($gun) {
        console.log('Gun successfully initialized in layout');
      }
    });
    
    return () => {
      unsubscribe();
      if (cleanup) cleanup();
    };
  });
</script>

<!-- Load Gun.js from CDN before any component code -->
<svelte:head>
</svelte:head>

<div class="app">
  <header>
    <div class="header-content">
      <h1>SvGun.js Demo</h1>
      <p>Svelte 5 bindings for Gun.js with enhanced error handling</p>
      {#if gunInitialized}
        <span class="gun-status connected">Gun.js connected</span>
      {:else}
        <span class="gun-status connecting">Connecting to Gun.js...</span>
      {/if}
    </div>
  </header>

  <main>
    <slot />
  </main>

  <footer>
    <div class="footer-content">
      <p>SvGun.js - Robust Svelte Gun.js Bindings</p>
      <p class="version">Version 0.1.0</p>
    </div>
  </footer>
</div>

<style>
  /* Global styles */
  :global(:root) {
    --primary-color: #4a54df;
    --secondary-color: #38bdf8;
    --text-color: #374151;
    --bg-color: #f9fafb;
    --border-color: #e5e7eb;
    --error-color: #ef4444;
    --success-color: #22c55e;
    --border-radius: 6px;
    --box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

    background-color: var(--bg-color);
    color: var(--text-color);
    font-family: var(--font-family);
    line-height: 1.5;
  }

  /* Global form styles */
  :global(button) {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  :global(button:hover) {
    background-color: #3a43c2;
  }

  :global(input, textarea, select) {
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    font-family: var(--font-family);
    width: 100%;
  }

  :global(.completed) {
    text-decoration: line-through;
    opacity: 0.6;
  }

  /* Layout styles */
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  header {
    background-color: var(--primary-color);
    color: white;
    padding: 16px;
    box-shadow: var(--box-shadow);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
  }

  header p {
    margin: 8px 0 0;
    opacity: 0.9;
  }

  main {
    flex: 1;
    padding: 32px 20px;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  footer {
    background-color: #f1f5f9;
    padding: 16px;
    border-top: 1px solid var(--border-color);
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  footer p {
    margin: 0;
    font-size: 14px;
    color: #64748b;
  }

  .version {
    font-size: 12px;
    opacity: 0.7;
  }

  .gun-status {
    display: inline-block;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 12px;
    margin-top: 8px;
  }
  
  .gun-status.connected {
    background-color: var(--success-color);
    color: white;
  }
  
  .gun-status.connecting {
    background-color: #f59e0b;
    color: white;
  }
</style> 