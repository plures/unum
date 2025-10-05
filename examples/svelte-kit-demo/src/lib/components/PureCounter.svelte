<script lang="ts">
  // This is a pure Svelte component with no knowledge of Gun.js
  // It only works with its props and direct callbacks
  const props = $props<{
    count?: number;
    onCountChanged?: ((count: number) => void) | null;
  }>();
  
  // Local state with default value if props.count is undefined
  let count = $state(props.count || 0);
  
  // Update local state when prop changes
  $effect(() => {
    if (props.count !== undefined) {
      count = props.count;
    } else {
      notifyCountChanged();
    }
  });
  
  // Increment counter
  function increment() {
    count += 1;
    notifyCountChanged();
  }
  
  // Decrement counter
  function decrement() {
    count -= 1;
    notifyCountChanged();
  }
  
  // Reset counter
  function reset() {
    count = 0;
    notifyCountChanged();
  }
  
  // Notify parent of changes
  function notifyCountChanged() {
    if (props.onCountChanged) {
      props.onCountChanged(count);
    }
  }
</script>

<div class="counter">
  <h3>Counter: {count}</h3>
  
  <div class="buttons">
    <button on:click={decrement}>-</button>
    <button on:click={reset}>Reset</button>
    <button on:click={increment}>+</button>
  </div>
  
  <p class="hint">This component has no knowledge of Gun.js!</p>
</div>

<style>
  .counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
  }
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .buttons {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  button {
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  button:hover {
    background-color: #3a80d2;
  }
  
  .hint {
    font-size: 0.8rem;
    color: #666;
    font-style: italic;
  }
</style> 