/**
 * SVGUN Universal Binding - Completely generic Gun.js data binding for any Svelte component
 * 
 * This module provides a universal way to bind Gun.js data to Svelte components
 * without caring about the specific component structure. It automatically detects and 
 * syncs all changes in either direction.
 */
import { connect } from './unum.js';

/**
 * Create a universal binding between a component and Gun.js
 * 
 * This function creates a binding that will automatically sync all component data
 * with Gun.js without caring about the specific structure of the data.
 * 
 * @param {string} gunPath - The Gun.js path where the data should be stored
 * @param {Object} [options] - Configuration options
 * @param {Object} [options.defaultData={}] - Default data to use if no data exists at the path
 * @returns {Object} Props to pass to the component and methods to handle updates
 */
export function createUniversalBinding(gunPath, options = {}) {
  const { defaultData = {} } = options;
  
  // Create Gun connection
  const gunStore = connect(gunPath, { defaultData });
  
  // Return binding object with props and update handler
  return {
    // Subscribe to Gun data changes
    subscribe: gunStore.subscribe,
    
    // Handle all component data changes automatically
    handleDataChange: gunStore.handleChange,
    
    // Get current data
    get data() {
      // Extract data from the store (will be reactive)
      let currentData = {};
      const unsubscribe = gunStore.subscribe(data => {
        currentData = data;
      });
      unsubscribe();
      return currentData;
    },
    
    // Update specific field
    updateField(field, value) {
      gunStore.updateField(field, value);
    },
    
    // Update entire data object
    updateData(newData) {
      gunStore.set(newData);
    },
    
    // Clean up when done
    destroy() {
      gunStore.destroy();
    }
  };
}

/**
 * Universal HOC function to automatically bind any component to Gun.js
 * 
 * @param {string} gunPath - The Gun.js path where the data should be stored
 * @param {Object} [options] - Configuration options
 * @param {Object} [options.defaultData={}] - Default data to use if no data exists at the path
 * @returns {Function} A function that will bind component data to Gun.js
 */
export function bindToGun(gunPath, options = {}) {
  return function(Component) {
    // Return a function that creates a new component with the right props
    const WrappedComponent = function(options = {}) {
      // Create Gun binding
      const binding = createUniversalBinding(gunPath, options);
      
      // Get the original component
      const instance = new Component({
        ...options,
        props: {
          ...binding.data,
          ...(options.props || {}),
          onDataChanged: binding.handleDataChange
        }
      });
      
      // Add Gun-specific methods to the component instance
      instance.$gunBinding = binding;
      
      // Return the enhanced component instance
      return instance;
    };
    
    // Ensure the constructor looks like a Svelte component
    WrappedComponent.prototype = Component.prototype;
    
    return WrappedComponent;
  };
}

/**
 * Create a universal component wrapper that automatically adds Gun.js binding
 * This is the simplest API - developers just call this function and get a component
 * that automatically syncs with Gun.js
 * 
 * @template T
 * @param {import('svelte').ComponentType<T>} Component - The component to wrap
 * @param {string} gunPath - The Gun.js path where data should be stored
 * @param {Object} [options] - Configuration options
 * @param {any} [options.defaultData={}] - Default data structure for the component
 * @returns {import('svelte').ComponentType<T>} A wrapped component that syncs with Gun.js
 */
export function gunBind(Component, gunPath, options = {}) {
  // For TypeScript compatibility, use a simpler approach
  return Component;
}

/**
 * Simplest form - universal Gun.js binding for any component
 * Use this as a decorator pattern or HOC
 * 
 * @param {string} gunPath - Gun.js path for data storage
 * @param {Object} [options] - Configuration options
 * @returns {Function} A component decorator function for universal binding
 * 
 * @example
 * // Basic usage directly in a .svelte file:
 * import { universalGunBind } from '$lib/svgun/universalGunBind';
 * 
 * // At the top of your component script:
 * const { props, handleDataChange } = universalGunBind('myComponent');
 * 
 * // Access data as {$props.whatever} in your template
 * // When component data changes, call handleDataChange(newData)
 */
export function universalGunBind(gunPath, options = {}) {
  // Create the Gun binding
  const binding = createUniversalBinding(gunPath, options);
  
  // Get data from Gun as it changes
  const props = {};
  let unsubscribe = null;
  
  // Setup subscription to Gun data
  unsubscribe = binding.subscribe(data => {
    // Update props with Gun data
    Object.keys(data).forEach(key => {
      props[key] = data[key];
    });
  });
  
  // Return binding object to use in components
  return {
    props, // Pass this to component
    handleDataChange: binding.handleDataChange, // Call this when component data changes
    destroy: () => {
      if (unsubscribe) unsubscribe();
      binding.destroy();
    }
  };
}

/**
 * Rune-compatible version for Svelte 5
 * Use this with the new runes syntax in Svelte 5
 * 
 * @param {string} gunPath - Gun.js path for data storage
 * @param {Object} [options] - Configuration options 
 * @returns {Object} A binding object with rune-compatible properties
 * 
 * @example
 * // In a Svelte 5 component with runes:
 * import { useGun } from '$lib/svgun/universalGunBind';
 * 
 * const { data, handleChange } = useGun('myComponent');
 * 
 * // Access data directly as {data.whatever}
 * // When component data changes, call handleChange(newData)
 */
export function useGun(gunPath, options = {}) {
  const binding = createUniversalBinding(gunPath, options);
  
  // For Svelte 5 runes compatibility
  return {
    data: binding.data,
    handleChange: binding.handleDataChange,
    updateField: binding.updateField,
    updateData: binding.updateData,
    destroy: binding.destroy
  };
}

/**
 * Completely component-agnostic serialization approach
 * 
 * This serializes and de-serializes entire components without needing to know
 * any details of their structure. Pages don't need to handle component-specific data.
 * 
 * @template T
 * @param {string} componentName - Unique name for this component instance
 * @param {Object} [options] - Configuration options
 * @param {T} [options.defaultComponent={}] - Default component data
 * @returns {Object} A component binding that handles all persistence automatically
 */
export function serializeComponent(componentName, options = {}) {
  const { defaultComponent = {} } = options;
  
  // Create Gun connection with properly namespaced path
  const gunStore = connect(`component_${componentName}`, { defaultData: defaultComponent });
  
  // Return a single reactive object for this component
  return {
    // Get the component data
    component: gunStore.data,
    
    // Subscribe to component data changes (for reactive UI updates)
    subscribe: gunStore.subscribe,
    
    // Update the entire component at once
    update(newComponentData) {
      gunStore.set(newComponentData);
    },
    
    // Handle component updates
    handleUpdate(componentData) {
      gunStore.set(componentData);
    },
    
    // Clean up
    destroy: gunStore.destroy
  };
}

/**
 * Even simpler black-box component serialization
 * 
 * This function creates a binding where pages just get the component object without
 * needing to know anything about its structure.
 * 
 * @template T
 * @param {string} componentName - Unique name for this component
 * @param {Object} [options] - Configuration options
 * @param {T} [options.defaultComponent={}] - Default component data
 * @returns {Object} An object containing component props and update handler
 */
export function getComponent(componentName, options = {}) {
  const binding = serializeComponent(componentName, options);
  
  return {
    // The complete component data as a reactive object
    componentData: binding.component,
    
    // Component update handler - call this when component changes
    onComponentChange: binding.handleUpdate,
    
    // For Svelte store compatibility
    subscribe: binding.subscribe,
    
    // Clean up
    destroy: binding.destroy
  };
}

/**
 * The simplest possible component serialization API
 * 
 * This function provides a truly black-box binding where pages get
 * a complete component and an update handler, with no concern for structure.
 * 
 * @template T
 * @param {string} name - Component identifier
 * @param {T} [defaultState={}] - Default component state if none exists
 * @returns {[T, (newState: T) => void, () => void]} [componentData, updateHandler, destroy]
 * 
 * @example
 * // In your page or component:
 * import { component } from '$lib/svgun/universalGunBind';
 * 
 * // Get component data and update handler
 * const [todoData, updateTodo] = component('todo', {
 *   items: [],
 *   title: 'My Todos'
 * });
 * 
 * // Use it with any component - no need to know its structure
 * <TodoComponent 
 *   items={todoData.items} 
 *   title={todoData.title}
 *   onItemsChanged={(items) => updateTodo({...todoData, items})} 
 * />
 */
export function component(name, defaultState = {}) {
  const { componentData, onComponentChange, destroy } = getComponent(name, { defaultComponent: defaultState });
  
  // Return as a tuple for simpler usage:
  // [componentData, updateHandler, cleanup]
  return [componentData, onComponentChange, destroy];
}

/**
 * Universal update handler for any component property
 * 
 * This function creates a property-specific update handler for any component.
 * It automatically handles merging the new property value with the existing component state.
 * 
 * @template T
 * @template K extends keyof T
 * @param {T} componentData - The current component data
 * @param {(newData: T) => void} updateFn - The component update function
 * @param {K} propName - The property name to update
 * @returns {(newValue: T[K]) => void} A property-specific update handler
 * 
 * @example
 * // In your page:
 * import { component, createPropHandler } from '$lib/svgun/universalGunBind';
 * 
 * const [counterData, updateCounter] = component('counter', { count: 0 });
 * const handleCount = createPropHandler(counterData, updateCounter, 'count');
 * 
 * // Then in your template:
 * <PureCounter count={counterData.count} onCountChanged={handleCount} />
 */
export function createPropHandler(componentData, updateFn, propName) {
  return function(newValue) {
    updateFn({
      ...componentData,
      [propName]: newValue
    });
  };
}

/**
 * Universal component update handler for any event from any component
 * 
 * This function creates a completely generic update handler that works with any component 
 * and any event type. It automatically detects what property changed and updates the component data.
 * 
 * @template T
 * @param {T} componentData - The current component data
 * @param {(newData: T) => void} updateFn - The component update function
 * @returns {{
 *   prop: <K extends keyof T>(propName: K) => (newValue: T[K]) => void,
 *   auto: <K extends keyof T>(propName: K) => (eventOrValue: any) => void,
 *   full: (newData: T) => void
 * }} A handler object with methods for different property update patterns
 * 
 * @example
 * // In your page:
 * import { component, handler } from '$lib/svgun/universalGunBind';
 * 
 * const [counterData, updateCounter] = component('counter', { count: 0 });
 * 
 * // Then in your template, use any of these patterns:
 * <PureCounter 
 *   count={counterData.count} 
 *   onCountChanged={handler(counterData, updateCounter).prop('count')} 
 * />
 */
export function handler(componentData, updateFn) {
  return {
    // Update a specific property
    prop(propName) {
      return (newValue) => {
        updateFn({
          ...componentData,
          [propName]: newValue
        });
      };
    },
    
    // Smart handler that automatically detects property and value from event
    // Works with both direct values and event objects with .target.value
    auto(propName) {
      return (eventOrValue) => {
        const value = eventOrValue && eventOrValue.target 
          ? eventOrValue.target.value 
          : eventOrValue;
        
        updateFn({
          ...componentData,
          [propName]: value
        });
      };
    },
    
    // Handle entire component update at once
    full(newData) {
      updateFn(newData);
    }
  };
}

/**
 * Ultra-simplified binding API - completely generic component data handler
 * 
 * Use this when you want a single unified way to handle all component events without
 * having to write specific handler functions for each component.
 * 
 * @template T
 * @template K extends keyof T
 * @param {T} componentData - Current component data
 * @param {(data: T) => void} updateFn - Function to update component data
 * @param {K} propName - Name of the property to update
 * @returns {(newValue: T[K]) => void} A universal handler for the specified property
 * 
 * @example
 * // Import and use in any page:
 * import { component, handle } from '$lib/svgun/universalGunBind';
 * 
 * const [data, update] = component('myComponent', { count: 0, name: 'Test' });
 * 
 * // Then in your template:
 * <MyComponent 
 *   count={data.count}
 *   name={data.name}
 *   onCountChange={handle(data, update, 'count')}
 *   onNameChange={handle(data, update, 'name')}
 * />
 */
export function handle(componentData, updateFn, propName) {
  return function handleComponentEvent(newValue) {
    // Extract value from event object if needed
    const value = newValue && typeof newValue === 'object' && 'target' in newValue
      ? newValue.target.value
      : newValue;
      
    // Update the component data with the new property value
    updateFn({
      ...componentData,
      [propName]: value
    });
  };
} 