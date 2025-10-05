<!-- SimpleForm.svelte - A pure component with no knowledge of Gun.js -->
<script lang="ts">
  // This is a pure component that uses Svelte 5 runes
  // It doesn't know anything about Gun.js or data persistence
  import { createEventDispatcher } from 'svelte';
  
  // Define props with TypeScript types
  interface FormProps {
    title?: string;
    name?: string;
    email?: string;
    message?: string;
  }
  
  // Properly declare props with Svelte 5 runes
  const props = $props<{
    title?: string;
    name?: string;
    email?: string;
    message?: string;
  }>();
  const title = props.title ?? 'Contact Form';
  const name = props.name ?? '';
  const email = props.email ?? '';
  const message = props.message ?? '';
  
  // Local state for form values - initialized from props
  let formName = $state(name);
  let formEmail = $state(email);
  let formMessage = $state(message);
  
  // Update local state when props change
  $effect(() => {
    if (props.name !== undefined) formName = props.name;
    if (props.email !== undefined) formEmail = props.email;
    if (props.message !== undefined) formMessage = props.message;
  });
  
  // Create event dispatcher
  const dispatch = createEventDispatcher();
  
  // Handle form submission
  function handleSubmit(e: Event) {
    e.preventDefault();
    
    // Dispatch update event with form data
    dispatch('update', {
      name: formName,
      email: formEmail,
      message: formMessage
    });
    
    // Clear form fields after submission (for real forms)
    // formName = '';
    // formEmail = '';
    // formMessage = '';
  }
</script>

<div class="form-container">
  <h3>{title}</h3>
  
  <form on:submit={handleSubmit}>
    <div class="form-group">
      <label for="name">Name</label>
      <input 
        type="text" 
        id="name" 
        name="name"
        bind:value={formName} 
        required
      />
    </div>
    
    <div class="form-group">
      <label for="email">Email</label>
      <input 
        type="email" 
        id="email" 
        name="email"
        bind:value={formEmail} 
        required
      />
    </div>
    
    <div class="form-group">
      <label for="message">Message</label>
      <textarea 
        id="message" 
        name="message"
        bind:value={formMessage} 
        rows="4"
        required
      ></textarea>
    </div>
    
    <button type="submit">Submit</button>
  </form>
  
  <div class="preview">
    <h4>Current Data</h4>
    <dl>
      <dt>Name:</dt>
      <dd>{formName || '(not set)'}</dd>
      
      <dt>Email:</dt>
      <dd>{formEmail || '(not set)'}</dd>
      
      <dt>Message:</dt>
      <dd>{formMessage || '(not set)'}</dd>
    </dl>
  </div>
  
  <p class="hint">This component has no knowledge of Gun.js or data persistence!</p>
</div>

<style>
  .form-container {
    padding: 1rem;
    max-width: 600px;
    margin: 0 auto;
  }
  
  h3 {
    margin-bottom: 1rem;
    font-size: 1.5rem;
  }
  
  .form-group {
    margin-bottom: 1rem;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  
  input, textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  button {
    background-color: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-weight: bold;
    cursor: pointer;
    margin-top: 0.5rem;
  }
  
  .preview {
    margin-top: 2rem;
    padding: 1rem;
    background-color: #f5f5f5;
    border-radius: 4px;
  }
  
  h4 {
    margin-bottom: 0.5rem;
    font-size: 1.2rem;
  }
  
  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.5rem;
  }
  
  dt {
    font-weight: bold;
  }
  
  dd {
    margin: 0;
  }
  
  .hint {
    font-size: 0.8rem;
    color: #666;
    font-style: italic;
    margin-top: 1rem;
  }
</style> 