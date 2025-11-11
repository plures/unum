import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pluresList, gunList } from '../src/actions.js';

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
  _: {}, // Required by PluresDB type
  map: vi.fn().mockReturnThis(),
};

describe('pluresList action', () => {
  let mockContainer: HTMLElement;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create container element
    mockContainer = document.createElement('ul');
  });

  it('should initialize with PluresDB data', () => {
    // Mock map to simulate a collection of items
    const callback = vi.fn();
    
    // Create action with mock PluresDB collection
    const action = pluresList(mockContainer, { db: mockDb, callback });
    
    // PluresDB.map should have been called
    expect(mockDb.map).toHaveBeenCalled();
  });

  it('should support legacy gun parameter', () => {
    const callback = vi.fn();
    
    // Create action with 'gun' parameter for backward compatibility
    const action = pluresList(mockContainer, { gun: mockDb, callback });
    
    // PluresDB.map should have been called
    expect(mockDb.map).toHaveBeenCalled();
  });
});

describe('gunList action (legacy)', () => {
  let mockContainer: HTMLElement;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockContainer = document.createElement('ul');
  });

  it('should work as an alias for pluresList', () => {
    const callback = vi.fn();
    
    // Create action with mock using legacy gunList
    const action = gunList(mockContainer, { gun: mockDb, callback });
    
    // Should work the same as pluresList
    expect(mockDb.map).toHaveBeenCalled();
  });
});