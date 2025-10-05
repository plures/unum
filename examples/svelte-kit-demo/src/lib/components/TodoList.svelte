<script>
  import { onMount, onDestroy } from 'svelte';

  // Initialize Gun - using window.Gun from CDN
  let gun = $state(null);
  let todosRef = $state(null);
  let todos = $state({});
  
  onMount(() => {
    // Make sure Gun is loaded from CDN
    if (window.Gun) {
      // Initialize Gun
      gun = window.Gun();
      
      // Create a reference to the todos in Gun
      todosRef = gun.get('todos');
      
      // Subscribe to todo changes
      todosRef.map().on((todoData, id) => {
        try {
          if (id !== '_') {
            // Update the todos object in a reactive way
            if (todoData === null) {
              // Handle deletion
              const newTodos = { ...todos };
              delete newTodos[id];
              todos = newTodos;
            } else {
              // Handle add/update
              todos = { 
                ...todos, 
                [id]: todoData 
              };
            }
          }
        } catch (error) {
          console.error('Error processing todo:', error);
        }
      });
    } else {
      console.error('Gun.js not loaded from CDN');
    }
  });
  
  // Cleanup subscriptions
  onDestroy(() => {
    if (todosRef) {
      // Unsubscribe from todos
      todosRef.map().off();
    }
  });
  
  // Create a new todo item
  let newTodoText = $state('');
  
  // Add a new todo
  function addTodo(e) {
    e.preventDefault();
    if (!newTodoText.trim() || !todosRef) return;
    
    const id = Date.now().toString();
    todosRef.get(id).put({
      text: newTodoText,
      completed: false,
      createdAt: Date.now(),
    });
    
    newTodoText = '';
  }
  
  // Toggle a todo's completed status
  function toggleTodo(id, currentStatus) {
    if (!todosRef) return;
    todosRef.get(id).get('completed').put(!currentStatus);
  }
  
  // Delete a todo
  function deleteTodo(id) {
    if (!todosRef) return;
    todosRef.get(id).put(null);
  }
</script>

<!-- Load Gun.js from CDN before component code -->
<svelte:head>
  <script src="https://cdn.jsdelivr.net/npm/gun/gun.js"></script>
</svelte:head>

<div class="todo-list">
  <h2>Todo List</h2>
  <p class="api-info">Using Gun.js direct subscription</p>
  
  <form onsubmit={(e) => { e.preventDefault(); addTodo(e); }} class="add-todo-form">
    <input
      type="text"
      placeholder="Add a new todo..."
      bind:value={newTodoText}
    />
    <button type="submit">Add</button>
  </form>
  
  <div class="todos-container">
    {#if Object.keys(todos).length > 0}
      <ul class="todos">
        {#each Object.entries(todos) as [id, todo]}
          <li>
            <div class="todo-item">
              <input 
                type="checkbox"
                checked={todo.completed}
                onchange={() => toggleTodo(id, todo.completed)}
              />
              <span class:completed={todo.completed}>
                {todo.text}
              </span>
            </div>
            <button 
              class="delete-btn"
              onclick={() => deleteTodo(id)}>
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

<style>
  .todo-list {
    width: 100%;
  }
  
  h2 {
    margin-bottom: 5px;
  }
  
  .api-info {
    margin-top: 0;
    color: #666;
    font-size: 14px;
    margin-bottom: 20px;
  }
  
  .add-todo-form {
    display: flex;
    margin-bottom: 20px;
  }
  
  .add-todo-form input {
    flex: 1;
    margin-right: 10px;
  }
  
  .todos-container {
    background: #f9f9f9;
    border-radius: var(--border-radius);
    padding: 10px;
  }
  
  .todos {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  
  .todos li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .todos li:last-child {
    border-bottom: none;
  }
  
  .todo-item {
    display: flex;
    align-items: center;
    flex: 1;
  }
  
  .todo-item input[type="checkbox"] {
    width: auto;
    margin-right: 10px;
  }
  
  .completed {
    text-decoration: line-through;
    color: #888;
  }
  
  .delete-btn {
    background-color: var(--secondary-color);
    padding: 4px 8px;
    font-size: 0.8rem;
  }
  
  .no-todos {
    text-align: center;
    color: #888;
    font-style: italic;
  }
</style> 