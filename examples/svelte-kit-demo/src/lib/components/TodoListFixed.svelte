<script>
  import { GunStore, safeMap } from '$lib/svgun';
  import { gun, todosRef } from '$lib/svgun/GunContext';
  
  // Simple state for UI
  let loading = $state(true);
  let initialized = $state(false);
  
  // Single source of truth for todos
  let todoStore = $state(null);
  let todoItems = $state([]);
  let storeData = $state(null);  // Add direct access to the store data
  
  // Subscribe to gun instance once
  const unsubscribeGun = gun.subscribe($gun => {
    console.log('Gun instance updated:', $gun ? 'available' : 'unavailable');
    loading = !$gun;
    
    if ($gun && !todoStore) {
      try {
        // Create a reference to todos
        const todoRef = $gun.get('todos');
        
        // Create our reactive store - this is the key to automatic reactivity
        todoStore = new GunStore(todoRef);
        
        // Subscribe once to reactively update our todo items
        const unsubscribeTodos = todoStore.subscribe(data => {
          console.log('TodoStore data updated:', data);
          if (data === undefined || data === null) {
            console.log('Received null/undefined data, initializing empty todos');
            // Initialize an empty object for our UI
            storeData = {};
            todoItems = [];
            // Set initialized to true so we can at least show the empty state
            initialized = true;
          } else if (data) {
            console.log('Received valid todos data:', data);
            storeData = data; // Store the data directly
            processTodoItems(data);
            initialized = true;
          }
        });
        
        return () => {
          unsubscribeTodos();
          if (todoStore) todoStore.destroy();
          todoStore = null;
        };
      } catch (error) {
        console.error('Error setting up todo store:', error);
        loading = false;
      }
    }
  });
  
  // Process todos into a usable array
  function processTodoItems(data) {
    console.log('Processing todo items from data:', data);
    
    todoItems = safeMap(data, (id, todo) => {
      if (!todo || typeof todo !== 'object') return null;
      
      console.log(`Processing todo item ${id}:`, todo);
      
      return {
        id,
        text: todo.text || '',
        completed: !!todo.completed,
        createdAt: todo.createdAt || Date.now()
      };
    });
    
    // Sort newest first
    todoItems.sort((a, b) => b.createdAt - a.createdAt);
    console.log('Processed todoItems:', todoItems);
  }
  
  // New todo text input
  let newTodoText = $state('');
  
  // Add a new todo - simple, just add to the store
  function addTodo(e) {
    e.preventDefault();
    if (!newTodoText.trim() || !todoStore) return;
    
    const id = Date.now().toString();
    const newTodo = {
      text: newTodoText.trim(),
      completed: false,
      createdAt: Date.now()
    };
    
    console.log('Adding new todo:', id, newTodo);
    
    // Get current data - ensure it's an object even if empty
    const currentData = storeData || {};
    
    // Create updated data
    const updatedData = {
      ...currentData,
      [id]: newTodo
    };
    
    console.log('Setting updated data:', updatedData);
    
    // Update directly in Gun for better reliability
    todoStore.gun.get(id).put(newTodo);
    
    // Also update our local state for immediate feedback
    storeData = updatedData;
    processTodoItems(updatedData);
    
    newTodoText = '';
  }
  
  // Toggle a todo's completed status
  function toggleTodo(id) {
    if (!todoStore) return;
    
    const currentData = storeData || {};
    const todo = currentData[id];
    
    if (todo) {
      // Create updated todo
      const updatedTodo = {
        ...todo,
        completed: !todo.completed
      };
      
      console.log('Toggling todo:', id, updatedTodo);
      
      // Update directly in Gun for better reactivity
      todoStore.gun.get(id).put(updatedTodo);
      
      // Also update our local state for immediate feedback
      storeData = {
        ...currentData,
        [id]: updatedTodo
      };
      processTodoItems(storeData);
    }
  }
  
  // Delete a todo
  function deleteTodo(id) {
    if (!todoStore) return;
    
    const currentData = { ...storeData } || {};
    delete currentData[id];
    
    console.log('Deleting todo:', id);
    
    // Use direct Gun.js API for deletion - it's more reliable
    todoStore.gun.get(id).put(null);
    
    // Also update our local state for immediate feedback
    storeData = currentData;
    processTodoItems(currentData);
  }
</script>

<div class="todo-list">
  <h2>Todo List - svgun-lib Powered</h2>
  <p class="api-info">Using shared Gun instance with Svelte 5 compatibility</p>
  
  <form onsubmit={(e) => { e.preventDefault(); addTodo(e); }} class="add-todo-form">
    <input
      type="text"
      placeholder="Add a new todo..."
      bind:value={newTodoText}
      disabled={loading || !todoStore}
    />
    <button type="submit" disabled={loading || !todoStore}>Add</button>
  </form>
  
  <div class="todos-container">
    {#if loading}
      <p class="loading">Loading Gun.js...</p>
    {:else if initialized}
      {#if todoItems.length > 0}
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
    {:else}
      <p class="error">Could not initialize Gun database. Please refresh the page to try again.</p>
    {/if}
  </div>
</div>

<style>
  .error {
    color: var(--error-color);
    font-weight: bold;
    text-align: center;
    padding: 1rem;
    background-color: rgba(239, 68, 68, 0.1);
    border-radius: var(--border-radius);
  }
  
  .loading {
    text-align: center;
    padding: 1rem;
    color: var(--primary-color);
  }
</style> 