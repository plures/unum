/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  try {
    const response = await resolve(event);
    return response;
  } catch (error) {
    console.error('Server error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Error handler for server-side errors
/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error, event }) {
  console.error('Server error:', error, 'URL:', event.url.pathname);
  
  return {
    message: 'Internal Server Error',
    code: error?.code || 'UNKNOWN'
  };
} 