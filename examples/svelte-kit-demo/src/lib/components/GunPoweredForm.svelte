<!-- GunPoweredForm.svelte - A wrapper component for SimpleForm with Gun.js integration -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gun as gunStore } from '$lib/svgun/GunContext.js';
  import SimpleForm from './SimpleForm.svelte';
  import { writable, get } from 'svelte/store';
  
  // Props for this component
  interface GunFormProps {
    title?: string;
  }
  
  // Get props 
  const props = $props();
  const title = props.title ?? 'Gun-Powered Form';
  
  // Form data interface
  interface FormData {
    name: string;
    email: string;
    message: string;
    [key: string]: any;  // Allow other properties
  }
  
  // Path for Gun data
  const gunPath = 'contactForm';
  
  // Default data
  const defaultData: FormData = {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello from Gun.js!'
  };
  
  // Create store for form data
  const formData = writable<FormData>(defaultData);
  
  // Gun subscriptions
  let gunRef: any = null;
  let gunUnsubscribe: any = null;
  let storeUnsubscribe: any = null;
  
  // Flag to prevent circular updates
  let isUpdatingFromGun = $state(false);
  let isInitialized = $state(false);
  
  // Interface for Gun
  interface GunInstance {
    get: (path: string) => any;
  }
  
  // Set up Gun integration
  onMount(() => {
    storeUnsubscribe = gunStore.subscribe(($gun: GunInstance | null) => {
      if (!$gun) return;
      
      // Get Gun reference
      gunRef = $gun.get(gunPath);
      
      // Initialize with default data if needed
      gunRef.once((data: any) => {
        if (!data || Object.keys(data).filter(k => k !== '_').length === 0) {
          gunRef.put(defaultData);
        } else {
          // Use existing data
          const cleanData: FormData = {
            name: data.name || defaultData.name,
            email: data.email || defaultData.email,
            message: data.message || defaultData.message
          };
          
          formData.set(cleanData);
        }
        
        isInitialized = true;
      });
      
      // Subscribe to updates
      gunUnsubscribe = gunRef.on((data: any) => {
        if (!data) return;
        
        isUpdatingFromGun = true;
        
        // Get clean data
        const cleanData: FormData = {
          name: data.name || defaultData.name,
          email: data.email || defaultData.email,
          message: data.message || defaultData.message
        };
        
        // Update form data
        formData.set(cleanData);
        
        // Reset flag
        setTimeout(() => {
          isUpdatingFromGun = false;
        }, 10);
      });
    });
  });
  
  // Clean up subscriptions
  onDestroy(() => {
    if (gunUnsubscribe) {
      gunUnsubscribe();
    }
    
    if (storeUnsubscribe) {
      storeUnsubscribe();
    }
  });
  
  // Handle updates from the form
  function handleUpdate(event: CustomEvent) {
    if (isUpdatingFromGun) return;
    
    const detail = event.detail;
    if (!detail) return;
    
    // Update Gun
    if (gunRef) {
      gunRef.put(detail);
    }
    
    // Update local state
    formData.set(detail as FormData);
  }
</script>

<!-- Show loading message until initialized -->
{#if !isInitialized}
  <div class="loading">Loading form data...</div>
{:else}
  <!-- Use SimpleForm with our data -->
  <SimpleForm 
    title={title} 
    name={$formData.name} 
    email={$formData.email} 
    message={$formData.message} 
    on:update={handleUpdate} 
  />
{/if}

<style>
  .loading {
    padding: 1rem;
    text-align: center;
    color: #666;
    font-style: italic;
  }
</style> 