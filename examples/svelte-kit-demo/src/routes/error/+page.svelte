<script>
  import ErrorComponent from '$lib/components/ErrorComponent.svelte';
  import { onMount } from 'svelte';
  
  // Get error details from URL params
  let errorMsg = '';
  let statusCode = 500;
  
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    errorMsg = urlParams.get('message') || 'An unexpected error occurred';
    statusCode = parseInt(urlParams.get('status') || '500', 10);
    
    // Set error details in our component
    if (window.setErrorDetails) {
      window.setErrorDetails({ message: errorMsg }, statusCode);
    }
  });
</script>

<ErrorComponent /> 