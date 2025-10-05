<script>
  import { gunData } from '$lib/svgun/runes.js';
  import { onMount, onDestroy } from 'svelte';
  
  // New todo text for the input field
  let newTodoText = '';
  
  // State for todo items and loading
  let todoItems = [];
  let isReady = false;
  let error = null;
  
  // Reference to the Gun data connection
  let todos;
  // Unsubscribe function for the Gun data
  let unsubscribeTodos;
  
  // Initialize Gun data connection when the component mounts
  onMount(() => {
    try {
      // Create a reactive connection to Gun data
      todos = gunData('todos');
      
      // Subscribe to changes from Gun
      unsubscribeTodos = todos.subscribe(state => {
        // When the Gun data changes, update our local reactive state
        todoItems = todos.list();
        console.log('Todo items updated:', todoItems);
        isReady = true;
      });
    } catch (err) {
      console.error('Error initializing todos:', err);
      error = err.message;
    }
  });
  
  // Simple function to add a new todo
  function addTodo(e) {
    e.preventDefault();
    if (!newTodoText.trim() || !todos) return;
    
    console.log('Adding todo with text:', newTodoText);
    
    try {
      // Add the todo to Gun data
      todos.add({
        text: newTodoText.trim(),
        completed: false,
        createdAt: Date.now()
      });
      
      // Clear the input field
      newTodoText = '';
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  }
  
  // Toggle a todo's completed status
  function toggleTodo(id) {
    if (!todos) return;
    
    console.log('Toggling todo:', id);
    
    try {
      // Get the current todo item
      const todo = todoItems.find(item => item.id === id);
      if (!todo) return;
      
      // Update the specific todo
      todos.update(id, todo => ({
        ...todo,
        completed: !todo.completed
      }));
    } catch (err) {
      console.error('Error toggling todo:', err);
    }
  }
  
  // Delete a todo
  function deleteTodo(id) {
    if (!todos) return;
    
    console.log('Deleting todo:', id);
    
    try {
      todos.remove(id);
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  }
  
  // Clean up when component is destroyed
  onDestroy(() => {
    if (unsubscribeTodos) {
      unsubscribeTodos();
    }
    if (todos) {
      todos.destroy();
    }
  });
</script>

<div class="todo-list">
  <h2>Todo List - Svelte 5 Runes Optimized</h2>
  <p class="api-info">Using the invisible Gun.js bindings with Svelte 5 Runes</p>
  
  <form onsubmit={addTodo} class="add-todo-form">
    <input
      type="text"
      placeholder="Add a new todo..."
      bind:value={newTodoText}
      disabled={!isReady}
    />
    <button type="submit" disabled={!isReady}>Add</button>
  </form>
  
  <div class="todos-container">
    {#if error}
      <p class="error">{error}</p>
    {:else if !isReady}
      <p class="loading">Loading todo items...</p>
    {:else if todoItems.length > 0}
      <ul class="todos">
        {#each todoItems as todo (todo.id)}
          <li>
            <div class="todo-item">
              <input 
                type="checkbox"
                checked={todo.completed}
                onchange={() => toggleTodo(todo.id)}
              />
              <span class:completed={todo.completed}>
                {todo.text || '[No text]'}
              </span>
            </div>
            <button 
              class="delete-btn"
              onclick={() => deleteTodo(todo.id)}>
              Delete
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="no-todos">No todos yet. Add one!</p>
    {/if}
  </div>
</div>