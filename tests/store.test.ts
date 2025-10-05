import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GunStore, createGunStore } from '../src/store.ts';

// Mock Gun instance
const mockGun = {
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

describe('GunStore', () => {
  let store: GunStore<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new GunStore(mockGun);
  });

  it('should create a store with Gun data', () => {
    expect(store).toBeDefined();
    expect(mockGun.on).toHaveBeenCalled();
  });

  it('should update Gun data with set method', () => {
    const newData = { name: 'Jane', age: 25 };
    store.set(newData);
    expect(mockGun.put).toHaveBeenCalledWith(newData);
  });

  it('should handle subscriptions correctly', () => {
    const callback = vi.fn();
    const unsubscribe = store.subscribe(callback);
    
    expect(callback).toHaveBeenCalledWith({ name: 'John', age: 30 });
    
    unsubscribe();
    // The unsubscribe from the store should call off on the internal handler
    expect(mockGun.on.mock.results[0].value.off).toHaveBeenCalled();
  });
});

describe('createGunStore', () => {
  it('should create a store with the factory function', () => {
    const store = createGunStore<{ name: string, age: number }>(mockGun);
    expect(store).toBeDefined();
    expect(mockGun.on).toHaveBeenCalled();
  });
}); 