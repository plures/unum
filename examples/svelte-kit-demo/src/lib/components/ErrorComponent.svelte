<script>
  // Use simple props instead of SvelteKit stores
  let error = $state(null);
  let status = $state(500);
  
  // Function to set error details - can be called from parent
  function setError(errorObj, statusCode = 500) {
    error = errorObj;
    status = statusCode;
  }

  // Export the function so it can be called from outside
  $effect(() => {
    if (window && !window.setErrorDetails) {
      window.setErrorDetails = setError;
    }
  });
</script>

<div class="error-container">
  <h1>{status}</h1>
  <p>{error?.message || 'An unexpected error occurred'}</p>
  <button onclick={() => window.location.href = '/'}>
    Return to Home Page
  </button>
</div>

<style>
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }
  
  h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
  }
  
  p {
    margin-bottom: 2rem;
  }
  
  button {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius);
    cursor: pointer;
  }
  
  button:hover {
    opacity: 0.9;
  }
</style> 