/** @type {import('@sveltejs/kit').HandleClientError} */
export function handleError({ error, event }) {
  console.error('Client error:', error, 'URL:', event.url.pathname);
  
  return {
    message: error.message || 'An unexpected error occurred',
    code: error?.code || 'UNKNOWN'
  };
} 