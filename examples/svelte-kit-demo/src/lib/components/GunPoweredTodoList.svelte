<script>
  import { onMount, onDestroy } from 'svelte';
  import { unum } from '$lib/svgun/unum';
  import PureTodoList from './PureTodoList.svelte';
  
  // State for loading
  let isLoading = $state(true);
  
  // The store containing todo list props
  let todoProps;
  let unsubscribe;
  
  // Initialize Gun data binding on mount
  onMount(() => {
    // Use unum to bind Gun data at the 'todos' path
    todoProps = unum('todos');
    
    // Subscribe to the props store to know when it's loaded
    unsubscribe = todoProps.subscribe(props => {
      // When items are defined, we're no longer loading
      if (props && 'items' in props) {
        isLoading = false;
      }
    });
    
    return () => {
      // Clean up when component is destroyed
      if (unsubscribe) unsubscribe();
      if (todoProps && todoProps.destroy) todoProps.destroy();
    };
  });
</script>

<div class="gun-powered-container">
  {#if isLoading}
    <p class="loading">Loading data from Gun.js...</p>
  {:else if $todoProps}
    <!-- Pass the Gun-powered props to the pure component -->
    <PureTodoList items={$todoProps.items} add={$todoProps.add} />
  {/if}
</div>

<style>
  .gun-powered-container {
    width: 100%;
  }
  
  .loading {
    text-align: center;
    padding: 2rem;
    color: #4a54df;
  }
</style> 