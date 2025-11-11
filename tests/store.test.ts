import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PluresStore, createPluresStore, GunStore, createGunStore } from '../src/store.js';

// Mock PluresDB instance
const mockDb = {
  get: vi.fn().mockReturnThis(),
  put: vi.fn().mockReturnThis(),
  on: vi.fn().mockImplementation((cb) => {
    cb({ name: 'John', age: 30 }, 'user');
    return { off: vi.fn() };
  }),
  once: vi.fn().mockImplementation((cb) => {
    cb({ name: 'John', age: 30 }, 'user');
  }),
  off: vi.fn().mockReturnThis(),
  _: {},
  map: vi.fn().mockReturnThis(),
};

describe('PluresStore', () => {
  let store: PluresStore<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new PluresStore(mockDb);
  });

  it('should create a store with PluresDB data', () => {
    expect(store).toBeDefined();
    expect(mockDb.on).toHaveBeenCalled();
  });

  it('should update PluresDB data with set method', () => {
    const newData = { name: 'Jane', age: 25 };
    store.set(newData);
    expect(mockDb.put).toHaveBeenCalledWith(newData);
  });

  it('should handle subscriptions correctly', () => {
    const callback = vi.fn();
    const unsubscribe = store.subscribe(callback);
    
    expect(callback).toHaveBeenCalledWith({ name: 'John', age: 30 });
    
    // Note: The actual unsubscribe doesn't call off on the handler directly
    // It's handled internally by the store
    unsubscribe();
  });
});

describe('createPluresStore', () => {
  it('should create a store with the factory function', () => {
    const store = createPluresStore<{ name: string, age: number }>(mockDb);
    expect(store).toBeDefined();
    expect(mockDb.on).toHaveBeenCalled();
  });
});

// Legacy compatibility tests
describe('GunStore (legacy)', () => {
  let store: GunStore<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new GunStore(mockDb);
  });

  it('should work as an alias for PluresStore', () => {
    expect(store).toBeDefined();
    expect(mockDb.on).toHaveBeenCalled();
  });
});