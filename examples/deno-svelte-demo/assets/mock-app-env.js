// Mock for $app/environment to support SvelteKit dependencies
// This provides the minimal implementation needed for unum

export const browser = typeof window !== 'undefined';
export const dev = true;
export const building = false;
export const version = '0.0.1'; 