// Import Svelte - note: runes are not available in the current version
// This will be replaced with runes when using a later version of Svelte

// Import Gun
import Gun from 'gun';

// Import unum directly - this is what makes Svelte development with Gun easier!
import { component, handle, handler } from './lib/gun-helpers.js';

// Initialize Gun
console.log('Initializing Gun...');
const gun = Gun({
  peers: ['http://localhost:8765/gun'],
  localStorage: false // Disable localStorage for Deno
});

// Make gun available globally for debugging
globalThis.gun = gun;

// Add debugging
gun.on('hi', peer => console.log('Connected to peer:', peer));
gun.on('bye', peer => console.log('Disconnected from peer:', peer));

// Define TodoItem interface
class TodoItem {
  constructor(id, text, done = false) {
    this.id = id;
    this.text = text;
    this.done = done;
    this.createdAt = Date.now();
  }
}

// Create Counter Component
function PureCounter({ count = 0, onCountChanged = null }) {
  // Local state
  let currentCount = $state(count);
  
  // Update local state when prop changes
  $effect(() => {
    if (count !== undefined) {
      currentCount = count;
    } else {
      notifyCountChanged();
    }
  });
  
  // Increment counter
  function increment() {
    currentCount += 1;
    notifyCountChanged();
  }
  
  // Decrement counter
  function decrement() {
    currentCount -= 1;
    notifyCountChanged();
  }
  
  // Reset counter
  function reset() {
    currentCount = 0;
    notifyCountChanged();
  }
  
  // Notify parent of changes
  function notifyCountChanged() {
    if (onCountChanged) {
      onCountChanged(currentCount);
    }
  }
  
  // Render the component
  return {
    mount(target) {
      const container = document.createElement('div');
      container.className = 'counter';
      
      const heading = document.createElement('h3');
      
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'buttons';
      
      const decrementButton = document.createElement('button');
      decrementButton.textContent = '-';
      decrementButton.addEventListener('click', decrement);
      
      const resetButton = document.createElement('button');
      resetButton.textContent = 'Reset';
      resetButton.addEventListener('click', reset);
      
      const incrementButton = document.createElement('button');
      incrementButton.textContent = '+';
      incrementButton.addEventListener('click', increment);
      
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'This component has no knowledge of Gun.js!';
      
      // Add buttons to container
      buttonsContainer.appendChild(decrementButton);
      buttonsContainer.appendChild(resetButton);
      buttonsContainer.appendChild(incrementButton);
      
      // Set up reactivity
      $effect(() => {
        heading.textContent = `Counter: ${currentCount}`;
      });
      
      // Assemble component
      container.appendChild(heading);
      container.appendChild(buttonsContainer);
      container.appendChild(hint);
      
      target.appendChild(container);
    }
  };
}

// Create TodoApp Component
function TodoApp({ items = [], title = 'Todo List', onItemsChanged = null }) {
  // Local state for new todo input
  let newTodoText = $state('');
  
  // Helper function to notify parent of changes
  function notifyChanges(updatedItems) {
    if (onItemsChanged) {
      onItemsChanged(updatedItems);
    }
  }
  
  // Add a new todo item
  function addTodo() {
    if (!newTodoText.trim()) return;
    
    const newItem = new TodoItem(
      Date.now().toString(),
      newTodoText
    );
    
    // Create a new array with the new item
    const updatedItems = [...items, newItem];
    
    // Notify parent of changes
    notifyChanges(updatedItems);
    
    // Clear the input
    newTodoText = '';
  }
  
  // Toggle the done status of a todo item
  function toggleTodo(id) {
    const updatedItems = items.map(item => 
      item.id === id 
        ? { ...item, done: !item.done } 
        : item
    );
    
    // Notify parent of changes
    notifyChanges(updatedItems);
  }
  
  // Remove a todo item
  function removeTodo(id) {
    const updatedItems = items.filter(item => item.id !== id);
    
    // Notify parent of changes
    notifyChanges(updatedItems);
  }
  
  // Handle form submission
  function handleSubmit(e) {
    e.preventDefault();
    addTodo();
  }
  
  // Render the component
  return {
    mount(target) {
      const todoApp = document.createElement('div');
      todoApp.className = 'todo-app';
      
      // Create title
      const heading = document.createElement('h3');
      heading.textContent = title;
      
      // Create form
      const form = document.createElement('form');
      form.addEventListener('submit', handleSubmit);
      
      const inputGroup = document.createElement('div');
      inputGroup.className = 'input-group';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Add a new todo...';
      input.value = newTodoText;
      input.addEventListener('input', e => { newTodoText = e.target.value; });
      
      const addButton = document.createElement('button');
      addButton.type = 'submit';
      addButton.textContent = 'Add';
      
      // Add input and button to input group
      inputGroup.appendChild(input);
      inputGroup.appendChild(addButton);
      
      // Add input group to form
      form.appendChild(inputGroup);
      
      // Create todo list
      const todoList = document.createElement('ul');
      todoList.className = 'todo-list';
      
      // Create hint
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'This component uses a callback approach instead of event dispatching';
      
      // Set up reactivity for the todo list
      $effect(() => {
        // Clear todo list
        todoList.innerHTML = '';
        
        // Check if items array is empty
        if (!items || items.length === 0) {
          const emptyItem = document.createElement('li');
          emptyItem.className = 'empty';
          emptyItem.textContent = 'No todo items yet!';
          todoList.appendChild(emptyItem);
        } else {
          // Render each item
          items.forEach(item => {
            const todoItem = document.createElement('li');
            todoItem.className = `todo-item${item.done ? ' done' : ''}`;
            
            const label = document.createElement('label');
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = item.done;
            checkbox.addEventListener('change', () => toggleTodo(item.id));
            
            const span = document.createElement('span');
            span.textContent = item.text;
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete';
            deleteButton.textContent = '×';
            deleteButton.addEventListener('click', () => removeTodo(item.id));
            
            // Assemble todo item
            label.appendChild(checkbox);
            label.appendChild(span);
            todoItem.appendChild(label);
            todoItem.appendChild(deleteButton);
            todoList.appendChild(todoItem);
          });
        }
      });
      
      // Assemble component
      todoApp.appendChild(heading);
      todoApp.appendChild(form);
      todoApp.appendChild(todoList);
      todoApp.appendChild(hint);
      
      target.appendChild(todoApp);
    }
  };
}

// Define default data for components
const counterDefaults = { count: 0 };
const todoDefaults = {
  items: [
    new TodoItem('1', 'Example todo item')
  ],
  title: "Black-Box Todo List"
};

// Use unum component API - structure-agnostic
// This is the KEY feature that makes unum powerful - it bridges Gun.js and Svelte
const [counterData, updateCounter] = component(gun, 'counter', counterDefaults);
const [todoData, updateTodo] = component(gun, 'todos', todoDefaults);

// Create typed handlers - These make updating properties easier
// Another powerful feature of unum
const handleCount = handle(counterData, updateCounter, 'count');
const handleItems = handle(todoData, updateTodo, 'items');

// Create handler objects with methods - More flexibility
// Third powerful feature of unum
const counterHandler = handler(counterData, updateCounter);
const countPropHandler = counterHandler.prop('count');

// Ensure all todo items have a text property
function ensureTodoTextProperties(items) {
  if (!items || !Array.isArray(items)) return [];
  
  return items.map((item, index) => {
    if (!item) return null;
    if (!item.text) {
      return {
        ...item,
        text: `Todo item ${(item.id || index + 1).toString().substring(0, 6)}`
      };
    }
    return item;
  }).filter(Boolean);
}

// Main application
function App() {
  // Render the application
  return {
    mount(target) {
      const container = document.createElement('div');
      
      // Create heading and introduction
      const intro = document.createElement('div');
      
      // Create examples container
      const examples = document.createElement('div');
      examples.className = 'examples';
      
      // Create the unum features section
      const featuresSection = document.createElement('div');
      const featuresHeading = document.createElement('h2');
      featuresHeading.textContent = 'unum Features';
      
      const featuresList = document.createElement('ul');
      featuresList.className = 'feature-list';
      
      const features = [
        'Structure-agnostic component serialization with Gun.js',
        'Typed handlers for property updates',
        'Flexible handler objects for different update patterns',
        'Svelte 5 runes compatibility',
        'Node.js and Deno support'
      ];
      
      features.forEach(feature => {
        const li = document.createElement('li');
        li.textContent = feature;
        featuresList.appendChild(li);
      });
      
      // Code example
      const codeHeading = document.createElement('h3');
      codeHeading.textContent = 'Simple Code Example:';
      
      const codeBlock = document.createElement('pre');
      codeBlock.className = 'code-block';
      codeBlock.textContent = `// Import the library
import { component, handle } from 'unum';
import Gun from 'gun';

// Initialize Gun
const gun = Gun();

// Create a reactive Gun-backed component
const [userData, updateUser] = component(gun, 'user', { name: 'John' });

// Create a handler for updating a specific property
const handleName = handle(userData, updateUser, 'name');

// Then in your component:
<input value={userData.name} on:input={(e) => handleName(e.target.value)} />`;
      
      featuresSection.appendChild(featuresHeading);
      featuresSection.appendChild(featuresList);
      featuresSection.appendChild(codeHeading);
      featuresSection.appendChild(codeBlock);
      
      // Create first example
      const example1 = document.createElement('section');
      example1.className = 'example';
      
      const title1 = document.createElement('h2');
      title1.textContent = 'Black-Box Component Serialization';
      
      const desc1 = document.createElement('p');
      desc1.textContent = 'This counter uses the new black-box serialization approach - truly structure-agnostic';
      
      const container1 = document.createElement('div');
      container1.className = 'container';
      
      // Create second example
      const example2 = document.createElement('section');
      example2.className = 'example';
      
      const title2 = document.createElement('h2');
      title2.textContent = 'Black-Box TodoApp Binding';
      
      const desc2 = document.createElement('p');
      desc2.textContent = 'This todo app uses the black-box binding - the page doesn\'t know about the component structure';
      
      const container2 = document.createElement('div');
      container2.className = 'container';
      
      const debug = document.createElement('div');
      debug.className = 'debug';
      
      const debugTitle = document.createElement('p');
      debugTitle.textContent = 'Component Data (synced with Gun.js):';
      
      const debugPre = document.createElement('pre');
      debugPre.className = 'json';
      
      // Add components to containers
      const counterComponent = PureCounter({
        count: counterData?.count || 0,
        onCountChanged: handleCount
      });
      counterComponent.mount(container1);
      
      // Create and mount TodoApp component
      $effect(() => {
        // Clear container
        container2.innerHTML = '';
        
        const processedItems = todoData?.items && Array.isArray(todoData.items) 
          ? ensureTodoTextProperties(todoData.items) 
          : [];
        
        const todoApp = TodoApp({
          items: processedItems,
          title: todoData?.title || "Black-Box Todo List",
          onItemsChanged: handleItems
        });
        
        todoApp.mount(container2);
        
        // Update debug view
        debugPre.textContent = JSON.stringify(todoData, null, 2);
      });
      
      // Assemble first example
      example1.appendChild(title1);
      example1.appendChild(desc1);
      example1.appendChild(container1);
      
      // Assemble second example
      example2.appendChild(title2);
      example2.appendChild(desc2);
      example2.appendChild(container2);
      debug.appendChild(debugTitle);
      debug.appendChild(debugPre);
      example2.appendChild(debug);
      
      // Assemble examples
      examples.appendChild(example1);
      examples.appendChild(example2);
      
      // Assemble page
      container.appendChild(featuresSection);
      container.appendChild(examples);
      
      // Mount everything
      target.innerHTML = '';
      target.appendChild(container);
    }
  };
}

// Wait for DOM to be ready
globalThis.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, rendering app...');
  // Render the app
  const app = App();
  app.mount(document.getElementById('app'));
}); 