/**
 * Test setup file
 * 
 * This file runs before all tests and sets up the necessary mocks and configuration
 */

import { afterAll } from 'vitest';

// Mock Svelte $state for runes API tests
// @ts-ignore - intentionally mocking global for tests
global.$state = function $state<T>(initialValue: T): T {
  return initialValue;
};

// Mock Gun types for testing
export interface GunChain<T> {
  get: (path: string) => GunChain<any>;
  put: (data: any) => GunChain<any>;
  on: (cb: (data: any, key: any) => void) => { off: () => void };
  once: (cb: (data: any, key: any) => void) => void;
  off: () => GunChain<any>;
  map: (cb?: (data: any, key: any) => void) => GunChain<any>;
  _: any;
}

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

// Restore console after tests
afterAll(() => {
  Object.assign(console, originalConsole);
}); 