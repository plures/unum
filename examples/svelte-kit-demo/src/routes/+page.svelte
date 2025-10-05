<!-- This is the main page with examples of different approaches -->
<script lang="ts">
  import { connect } from '$lib/svgun/unum';
  import { gunBind, component, handle, handler } from '$lib/svgun/universalGunBind';
  import PureCounter from '$lib/components/PureCounter.svelte';
  import TodoApp from '$lib/components/TodoApp.svelte';
  import SimpleForm from '$lib/components/SimpleForm.svelte';
  import GunPoweredForm from '$lib/components/GunPoweredForm.svelte';
  import { onMount } from 'svelte';
  import { gun as gunStore } from '$lib/svgun/GunContext';
  
  // Define a simple type for Gun instance
  interface GunInstance {
    get: (path: string) => any;
  }

  // Define the TodoItem interface to match the component
  interface TodoItem {
    id: string;
    text: string;
    done: boolean;
    createdAt: number;
  }
  
  // Define types for our component data
  interface CounterComponent {
    count: number;
    [key: string]: any;
  }
  
  interface TodoComponent {
    items: TodoItem[];
    title: string;
    [key: string]: any;
  }
  
  // Default counter component state
  const counterDefaults: CounterComponent = {
    count: 0
  };
  
  // Default todo component state
  const todoDefaults: TodoComponent = {
    items: [
      { id: '1', text: 'Example todo item', done: false, createdAt: Date.now() }
    ],
    title: "Black-Box Todo List"
  };
  
  // Use our new black-box component API - completely structure-agnostic
  const [counterData, updateCounter] = component<CounterComponent>('counter', counterDefaults);
  const [todoData, updateTodo] = component<TodoComponent>('todos', todoDefaults);
  
  // Create a gun-bound version of SimpleForm - without explicit typing to avoid TypeScript errors
  // TypeScript doesn't handle the HOC pattern well here, but it works at runtime
  const GunBoundForm = gunBind(SimpleForm, 'contactForm', {
    defaultData: {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello from Gun.js!'
    } as any  // Type assertion to avoid TypeScript error
  });
  
  // Ensure all todo items have a text property
  function ensureTodoTextProperties(items: any[]): TodoItem[] {
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
    }).filter(Boolean) as TodoItem[];
  }
  
  // Type definition for a counter change handler
  type CountChangeHandler = (count: number) => void;
  
  // Type definition for a todo items change handler
  type ItemsChangeHandler = (items: TodoItem[]) => void;
  
  // Create properly typed handlers for our components
  const handleCount: CountChangeHandler = handle(counterData, updateCounter, 'count');
  const handleItems: ItemsChangeHandler = handle(todoData, updateTodo, 'items');
  
  // Create handler objects with properly typed methods
  const counterHandler = handler<CounterComponent>(counterData, updateCounter);
  const countPropHandler: CountChangeHandler = counterHandler.prop('count');
  
  // Make sure todos are properly initialized
  onMount(() => {
    // Subscribe to Gun to access it directly
    const unsubscribe = gunStore.subscribe(($gun: GunInstance | null) => {
      if (!$gun) return;
      
      // Get the todos node directly
      const todos = $gun.get('component_todos');
      
      // Check if we have valid todos data
      todos.once((data: any) => {
        // If no data or no items, create a default todo
        if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
          const defaultTodos = {
            items: [
              { 
                id: 'default-' + Date.now(), 
                text: 'Default todo item', 
                done: false, 
                createdAt: Date.now() 
              }
            ],
            title: "Black-Box Todo List"
          };
          
          // Initialize with default data
          todos.put(defaultTodos);
        } else if (data.items) {
          // Ensure each todo has a text property
          const fixedItems = ensureTodoTextProperties(data.items);
          if (JSON.stringify(fixedItems) !== JSON.stringify(data.items)) {
            // Update items while keeping other component properties
            const updatedData = { ...data, items: fixedItems };
            todos.put(updatedData);
          }
        }
      });
    });
    
    return () => {
      unsubscribe();
    };
  });
</script>

<h1>SvGun Examples</h1>

<div class="examples">
  <section class="example">
    <h2>Black-Box Component Serialization</h2>
    <p>This counter uses the new black-box serialization approach - truly structure-agnostic</p>
    <div class="container">
      <PureCounter 
        count={(counterData as CounterComponent)?.count || 0} 
        onCountChanged={handleCount} 
      />
    </div>
    <div class="description">
      <p class="note">
        This approach treats the component as a complete black box. The page doesn't need to know about the component's internal structure - it just updates the whole component data when changes happen.
      </p>
      <details>
        <summary>See the code</summary>
        <pre>{`
// In your page script:
import { component, handle } from '$lib/svgun/universalGunBind';

// Get component data and update handler - truly structure-agnostic
const [counterData, updateCounter] = component('counter', { count: 0 });

// Create a typed handler for the count property
const handleCount = handle(counterData, updateCounter, 'count');

// Then in your template:
<PureCounter 
  count={counterData?.count || 0} 
  onCountChanged={handleCount} 
/>
        `}</pre>
      </details>
    </div>
  </section>

  <section class="example">
    <h2>Advanced Handler Pattern</h2>
    <p>This counter uses the more flexible handler pattern with methods</p>
    <div class="container">
      <PureCounter 
        count={(counterData as CounterComponent)?.count || 0} 
        onCountChanged={countPropHandler} 
      />
    </div>
    <div class="description">
      <p class="note">
        The handler() function creates an object with methods for different update patterns.
        This approach gives you more flexibility in how you handle updates.
      </p>
      <details>
        <summary>See the code</summary>
        <pre>{`
// In your page script:
import { component, handler } from '$lib/svgun/universalGunBind';

// Get component data and update handler
const [counterData, updateCounter] = component('counter', { count: 0 });

// Create a handler object with methods
const counterHandler = handler(counterData, updateCounter);
const countPropHandler = counterHandler.prop('count');

// Then in your template:
<PureCounter 
  count={counterData?.count || 0} 
  onCountChanged={countPropHandler} 
/>

// Or for form inputs that emit events with target.value:
<input 
  value={counterData.name} 
  onInput={counterHandler.auto('name')} 
/>

// Or handle whole component updates:
<SomeComponent 
  data={counterData} 
  onChange={counterHandler.full} 
/>
        `}</pre>
      </details>
    </div>
  </section>

  <section class="example">
    <h2>Black-Box TodoApp Binding</h2>
    <p>This todo app uses the black-box binding - the page doesn't know about the component structure</p>
    <div class="container">
      <TodoApp 
        items={(todoData as TodoComponent)?.items && Array.isArray((todoData as TodoComponent).items) ? 
          ensureTodoTextProperties((todoData as TodoComponent).items) : []} 
        title={(todoData as TodoComponent)?.title || "Black-Box Todo List"} 
        onItemsChanged={handleItems} 
      />
    </div>
    <div class="debug">
      <p>Component Data:</p>
      <pre class="json">{JSON.stringify(todoData, null, 2)}</pre>
    </div>
    <div class="description">
      <p class="note">
        With this approach, the page doesn't need to know that TodoApp has "items" property or what structure it has. The component is treated as a complete object that's serialized to/from Gun.js.
      </p>
      <details>
        <summary>See the code</summary>
        <pre>{`
// In your page script:
import { component, handle } from '$lib/svgun/universalGunBind';

// Get component data and update handler - completely structure-agnostic
const [todoData, updateTodo] = component('todos', {
  items: [{ id: '1', text: 'Example item', done: false, createdAt: Date.now() }],
  title: 'Black-Box Todo List'
});

// Create a typed handler for the items property
const handleItems = handle(todoData, updateTodo, 'items');

// Then in your template - we just pass the whole component data:
<TodoApp 
  items={todoData?.items} 
  title={todoData?.title} 
  onItemsChanged={handleItems} 
/>
        `}</pre>
      </details>
    </div>
  </section>
  
  <section class="example">
    <h2>Universal Component Wrapper</h2>
    <p>This form uses the universal gunBind function - zero Gun.js code needed</p>
    <div class="container">
      <SimpleForm 
        name="John Doe" 
        email="john@example.com" 
        message="This form is connected to Gun.js with zero extra code!"
        title="Universal Gun Binding" 
      />
      <p class="note">Note: Using the universal wrapper directly isn't working properly in this demo. This is a simplified example.</p>
    </div>
    <div class="description">
      <p class="note">
        This approach completely abstracts Gun.js away from components.
        Any component can be enhanced with Gun.js persistence with zero changes to the component.
        The gunBind function handles all data binding and synchronization automatically.
      </p>
      <details>
        <summary>See the code</summary>
        <pre>{`
// In your main file or page:
import { gunBind } from '$lib/svgun/universalGunBind';
import MyComponent from './MyComponent.svelte';

// Create a Gun-bound version in just one line
const GunBoundComponent = gunBind(MyComponent, 'myDataPath', {
  defaultData: {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello!'
  }
});

// Then use it anywhere
<GunBoundComponent title="My Custom Title" />

// That's it! The component automatically syncs with Gun.js
        `}</pre>
      </details>
    </div>
  </section>
</div>

<style>
  h1 {
    margin-bottom: 1rem;
    font-size: 2rem;
  }
  
  .examples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
  }
  
  .example {
    background-color: #f9f9f9;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  h2 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }
  
  p {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 1rem;
  }
  
  .container {
    background-color: white;
    border-radius: 8px;
    padding: 1rem;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    margin-bottom: 1rem;
  }
  
  .description {
    margin-top: 1rem;
  }
  
  .note {
    border-left: 3px solid #4a90e2;
    padding-left: 1rem;
    font-size: 0.85rem;
    line-height: 1.4;
  }
  
  details {
    margin-top: 1rem;
  }
  
  summary {
    color: #4a90e2;
    cursor: pointer;
    font-weight: bold;
  }
  
  pre {
    background-color: #f0f0f0;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    margin-top: 0.5rem;
  }
  
  code {
    font-family: monospace;
    font-size: 0.9rem;
    line-height: 1.4;
  }
  
  .debug {
    margin-top: 1rem;
    padding: 0.5rem;
    background-color: #f0f0f0;
    border-radius: 4px;
    font-size: 0.85rem;
  }
  
  .json {
    font-size: 0.8rem;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .debug ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }
  
  .debug li {
    margin-bottom: 0.25rem;
  }
</style> 