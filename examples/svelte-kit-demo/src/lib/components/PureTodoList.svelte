<script>
  // Props from parent/container - using Svelte 5 runes syntax
  const { items = [] } = $props();
  
  // Local state
  let newTodoText = $state('');
  
  // Handle form submission to add a new todo
  function handleSubmit(e) {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    
    // Create a new todo item
    const newTodo = {
      _id: Date.now().toString(), // Use timestamp as ID
      text: newTodoText.trim(),
      completed: false,
      createdAt: Date.now()
    };
    
    // Add to the items array directly
    // In Svelte 5, this triggers reactivity
    // Our unum function will detect this change and sync with Gun
    items.unshift(newTodo);
    
    // Clear the input
    newTodoText = '';
  }
  
  // Toggle a todo's completed status
  function toggleCompleted(item) {
    // Find the item in the array
    const index = items.findIndex(i => i._id === item._id);
    if (index !== -1) {
      // Create a new item with toggled completed status
      const updatedItem = { 
        ...item, 
        completed: !item.completed 
      };
      
      // Replace the item in the array
      items[index] = updatedItem;
    }
  }
  
  // Delete a todo
  function deleteTodo(item) {
    // Filter out the item from the array
    const index = items.findIndex(i => i._id === item._id);
    if (index !== -1) {
      items.splice(index, 1);
    }
  }
</script>

<div class="todo-list">
  <h2>Todo List - Pure Component</h2>
  <p class="api-info">This component knows nothing about Gun.js</p>
  
  <form on:submit={handleSubmit} class="add-todo-form">
    <input
      type="text"
      placeholder="Add a new todo..."
      bind:value={newTodoText}
    />
    <button type="submit">Add</button>
  </form>
  
  <div class="todos-container">
    {#if items.length > 0}
      <ul class="todos">
        {#each items as item (item._id)}
          <li>
            <div class="todo-item">
              <input 
                type="checkbox"
                checked={item.completed}
                on:change={() => toggleCompleted(item)}
              />
              <span class:completed={item.completed}>
                {item.text || '[No text]'}
              </span>
            </div>
            <button 
              class="delete-btn"
              on:click={() => deleteTodo(item)}>
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
    max-width: 600px;
    margin: 0 auto;
  }
  
  .todo-item {
    display: flex;
    align-items: center;
    flex: 1;
  }
  
  .todo-item input[type="checkbox"] {
    margin-right: 10px;
  }
  
  .completed {
    text-decoration: line-through;
    color: #888;
  }
  
  .add-todo-form {
    display: flex;
    margin-bottom: 20px;
  }
  
  .add-todo-form input {
    flex: 1;
    margin-right: 10px;
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
    border-bottom: 1px solid var(--border-color, #eee);
  }
  
  .delete-btn {
    background-color: var(--error-color, #ef4444);
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  
  .no-todos {
    text-align: center;
    color: #888;
    font-style: italic;
    padding: 1rem;
  }
</style> 