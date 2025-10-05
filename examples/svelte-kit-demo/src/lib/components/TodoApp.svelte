<script lang="ts">
  // Define types for todo items
  export interface TodoItem {
    id: string;
    text: string;
    done: boolean;
    createdAt: number;
  }

  // Get props using Svelte 5 runes
  const { 
    items = [], 
    title = 'Todo List',
    onItemsChanged = null
  } = $props<{
    items: TodoItem[];
    title: string;
    onItemsChanged?: ((items: TodoItem[]) => void) | null;
  }>();

  // Local state for new todo input
  let newTodoText = $state('');

  // Helper function to notify parent of changes
  function notifyChanges(updatedItems: TodoItem[]) {
    if (onItemsChanged) {
      onItemsChanged(updatedItems);
    }
  }

  // Add a new todo item
  function addTodo() {
    if (!newTodoText.trim()) return;
    
    const newItem: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText,
      done: false,
      createdAt: Date.now()
    };
    
    // Create a new array with the new item
    const updatedItems = [...items, newItem];
    
    // Notify parent of changes
    notifyChanges(updatedItems);
    
    // Clear the input
    newTodoText = '';
  }
  
  // Toggle the done status of a todo item
  function toggleTodo(id: string) {
    const updatedItems = items.map((item: TodoItem) => 
      item.id === id 
        ? { ...item, done: !item.done } 
        : item
    );
    
    // Notify parent of changes
    notifyChanges(updatedItems);
  }
  
  // Remove a todo item
  function removeTodo(id: string) {
    const updatedItems = items.filter((item: TodoItem) => item.id !== id);
    
    // Notify parent of changes
    notifyChanges(updatedItems);
  }
  
  // Handle form submission
  function handleSubmit(e: Event) {
    e.preventDefault();
    addTodo();
  }
</script>

<div class="todo-app">
  <h3>{title}</h3>
  
  <form on:submit={handleSubmit}>
    <div class="input-group">
      <input 
        type="text" 
        placeholder="Add a new todo..." 
        bind:value={newTodoText}
      />
      <button type="submit">Add</button>
    </div>
  </form>
  
  <ul class="todo-list">
    {#if !items || items.length === 0}
      <li class="empty">No todo items yet!</li>
    {:else}
      {#each items as item (item.id)}
        <li class="todo-item" class:done={item.done}>
          <label>
            <input 
              type="checkbox" 
              checked={item.done} 
              on:change={() => toggleTodo(item.id)}
            />
            <span>{item.text}</span>
          </label>
          <button class="delete" on:click={() => removeTodo(item.id)}>×</button>
        </li>
      {/each}
    {/if}
  </ul>
  
  <p class="hint">This component uses a callback approach instead of event dispatching</p>
</div>

<style>
  .todo-app {
    padding: 1rem;
  }
  
  h3 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }
  
  .input-group {
    display: flex;
    margin-bottom: 1rem;
  }
  
  input[type="text"] {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px 0 0 4px;
    font-size: 1rem;
  }
  
  button[type="submit"] {
    padding: 0.5rem 1rem;
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 0 4px 4px 0;
    font-weight: bold;
    cursor: pointer;
  }
  
  .todo-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .todo-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
  }
  
  .todo-item.done span {
    text-decoration: line-through;
    color: #999;
  }
  
  .todo-item label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }
  
  .delete {
    background: none;
    border: none;
    color: #ff5555;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 0.5rem;
  }
  
  .empty {
    color: #999;
    font-style: italic;
    padding: 1rem 0;
  }
  
  .hint {
    font-size: 0.8rem;
    color: #666;
    font-style: italic;
    margin-top: 1rem;
  }
</style> 