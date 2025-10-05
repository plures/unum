// Disable SSR for this route since it requires client-side Gun.js
export const ssr = false;

// Hydrate components on client
export const csr = true;

// Prerender the page at build time
export const prerender = false; 