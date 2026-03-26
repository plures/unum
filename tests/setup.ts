/**
 * Test setup file
 *
 * This file runs before all tests and sets up the necessary mocks and configuration
 */

import { afterAll } from 'vitest';

// Mock Svelte $state for runes API tests
(global as Record<string, unknown>)['$state'] = function $state<T>(initialValue: T): T {
  return initialValue;
};

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

// Restore console after tests
afterAll(() => {
  Object.assign(console, originalConsole);
});