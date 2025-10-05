import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gun, gunList } from '../src/actions.ts';

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
  _: {}, // Required by Gun type
  map: vi.fn().mockReturnThis(),
};

describe('gun action', () => {
  // Create mock element for testing
  let mockElement: HTMLInputElement;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockElement = document.createElement('input');
    mockElement.type = 'text';
  });

  it('should bind Gun data to an input element', () => {
    // Create action with mock Gun node
    const action = gun(mockGun);
    
    // Initialize the action on the element
    action(mockElement);
    
    // Gun.on should have been called
    expect(mockGun.on).toHaveBeenCalled();
    
    // Element value should be updated with Gun data
    expect(mockElement.value).toBe('John');
  });

  it('should update Gun data when input changes', () => {
    // Create action with mock Gun node
    const action = gun(mockGun);
    
    // Initialize the action on the element
    action(mockElement);
    
    // Simulate user input
    mockElement.value = 'Jane';
    mockElement.dispatchEvent(new Event('input'));
    
    // Gun.put should have been called with the new value
    expect(mockGun.put).toHaveBeenCalledWith('Jane');
  });
});

describe('gunList action', () => {
  let mockContainer: HTMLElement;
  let mockTemplate: HTMLElement;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create container and template elements
    mockContainer = document.createElement('ul');
    mockTemplate = document.createElement('li');
    mockTemplate.dataset.gunTemplate = 'true';
    
    const nameSpan = document.createElement('span');
    nameSpan.setAttribute('name', 'name');
    mockTemplate.appendChild(nameSpan);
    
    mockContainer.appendChild(mockTemplate);
  });

  it('should render a list of Gun items', () => {
    // Mock map to simulate a collection of items
    mockGun.map.mockImplementation((cb) => {
      if (cb) {
        cb(mockGun, 'item1');
        cb(mockGun, 'item2');
      }
      return mockGun;
    });
    
    // Create action with mock Gun collection
    const action = gunList(mockGun);
    
    // Initialize the action on the container
    action(mockContainer);
    
    // Gun.map should have been called
    expect(mockGun.map).toHaveBeenCalled();
    
    // Container should have the template plus two items
    expect(mockContainer.children.length).toBe(3);
  });
}); 