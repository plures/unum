import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createDesignableComponent,
  createGunDesignableComponent,
} from '../src/designMode.js';

// ---------------------------------------------------------------------------
// Helpers / mocks
// ---------------------------------------------------------------------------

function makeMockDb() {
  const listeners: Record<string, ((data: unknown) => void)[]> = {};

  const nodeProxy = (path: string) => ({
    _path: path,
    on: vi.fn().mockImplementation((cb: (data: unknown) => void) => {
      if (!listeners[path]) listeners[path] = [];
      listeners[path].push(cb);
      return { off: vi.fn() };
    }),
    off: vi.fn(),
    put: vi.fn(),
    get: vi.fn().mockImplementation((sub: string) => nodeProxy(`${path}/${sub}`)),
    // helper to simulate a live PluresDB push
    _emit: (data: unknown) => {
      (listeners[path] || []).forEach((cb) => cb(data));
    },
  });

  const root = {
    get: vi.fn().mockImplementation((path: string) => nodeProxy(path)),
  };

  return root;
}

const MockComponent = vi.fn();

// ---------------------------------------------------------------------------
// createDesignableComponent tests
// ---------------------------------------------------------------------------

describe('createDesignableComponent', () => {
  it('should be a function', () => {
    expect(typeof createDesignableComponent).toBe('function');
  });

  it('should return an object with the expected API', () => {
    const d = createDesignableComponent({ component: MockComponent });

    expect(d).toBeDefined();
    expect(typeof d.getMode).toBe('function');
    expect(typeof d.setMode).toBe('function');
    expect(typeof d.toggleMode).toBe('function');
    expect(typeof d.getTemplate).toBe('function');
    expect(typeof d.getConfig).toBe('function');
    expect(typeof d.setCustomizations).toBe('function');
    expect(typeof d.setTemplate).toBe('function');
    expect(typeof d.subscribe).toBe('function');
    expect(typeof d.destroy).toBe('function');
  });

  it('should expose the wrapped component', () => {
    const d = createDesignableComponent({ component: MockComponent });
    expect(d.component).toBe(MockComponent);
  });
});

// ---------------------------------------------------------------------------
// Mode management
// ---------------------------------------------------------------------------

describe('mode management', () => {
  it('should default to normal mode', () => {
    const d = createDesignableComponent({ component: MockComponent });
    expect(d.getMode()).toBe('normal');
  });

  it('should initialise to design mode when designMode=true', () => {
    const d = createDesignableComponent({ component: MockComponent, designMode: true });
    expect(d.getMode()).toBe('design');
  });

  it('setMode should switch to design mode', () => {
    const d = createDesignableComponent({ component: MockComponent });
    d.setMode('design');
    expect(d.getMode()).toBe('design');
  });

  it('setMode should switch back to normal mode', () => {
    const d = createDesignableComponent({ component: MockComponent, designMode: true });
    d.setMode('normal');
    expect(d.getMode()).toBe('normal');
  });

  it('setMode should warn on unknown mode and leave mode unchanged', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const d = createDesignableComponent({ component: MockComponent });
    d.setMode('unknown' as 'normal');
    expect(d.getMode()).toBe('normal');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('toggleMode should switch from normal to design', () => {
    const d = createDesignableComponent({ component: MockComponent });
    d.toggleMode();
    expect(d.getMode()).toBe('design');
  });

  it('toggleMode should switch from design to normal', () => {
    const d = createDesignableComponent({ component: MockComponent, designMode: true });
    d.toggleMode();
    expect(d.getMode()).toBe('normal');
  });
});

// ---------------------------------------------------------------------------
// Template system
// ---------------------------------------------------------------------------

describe('template system', () => {
  const normalTemplate = { type: 'normal-ui' };
  const designTemplate = { type: 'design-ui' };

  it('should return the normal template in normal mode', () => {
    const d = createDesignableComponent({
      component: MockComponent,
      templates: { normal: normalTemplate, design: designTemplate },
    });
    expect(d.getTemplate()).toBe(normalTemplate);
  });

  it('should return the design template in design mode', () => {
    const d = createDesignableComponent({
      component: MockComponent,
      designMode: true,
      templates: { normal: normalTemplate, design: designTemplate },
    });
    expect(d.getTemplate()).toBe(designTemplate);
  });

  it('should return the correct template after toggling mode', () => {
    const d = createDesignableComponent({
      component: MockComponent,
      templates: { normal: normalTemplate, design: designTemplate },
    });
    d.toggleMode();
    expect(d.getTemplate()).toBe(designTemplate);
    d.toggleMode();
    expect(d.getTemplate()).toBe(normalTemplate);
  });

  it('should return null when no template is defined for the active mode', () => {
    const d = createDesignableComponent({ component: MockComponent });
    expect(d.getTemplate()).toBeNull();
  });

  it('setTemplate should update the template for a given mode', () => {
    const d = createDesignableComponent({ component: MockComponent });
    const newTemplate = { type: 'updated' };
    d.setTemplate('normal', newTemplate);
    expect(d.getTemplate()).toBe(newTemplate);
  });
});

// ---------------------------------------------------------------------------
// Customizations
// ---------------------------------------------------------------------------

describe('customizations', () => {
  it('should initialize with provided customizations', () => {
    const d = createDesignableComponent({
      component: MockComponent,
      customizations: { theme: 'dark' },
    });
    expect(d.getConfig().customizations).toEqual({ theme: 'dark' });
  });

  it('setCustomizations should merge updates', () => {
    const d = createDesignableComponent({
      component: MockComponent,
      customizations: { theme: 'dark' },
    });
    d.setCustomizations({ fontSize: 14 });
    expect(d.getConfig().customizations).toEqual({ theme: 'dark', fontSize: 14 });
  });

  it('setCustomizations should overwrite existing keys', () => {
    const d = createDesignableComponent({
      component: MockComponent,
      customizations: { theme: 'dark' },
    });
    d.setCustomizations({ theme: 'light' });
    expect(d.getConfig().customizations.theme).toBe('light');
  });
});

// ---------------------------------------------------------------------------
// PluresDB persistence
// ---------------------------------------------------------------------------

describe('PluresDB persistence', () => {
  it('should persist mode to PluresDB when setMode is called', () => {
    const db = makeMockDb();
    const d = createDesignableComponent({
      component: MockComponent,
      database: db as unknown as object,
      componentId: 'test-comp',
    });
    d.setMode('design');
    // db.get('design_mode/test-comp').put(...) should have been called
    expect(db.get).toHaveBeenCalledWith('design_mode/test-comp');
  });

  it('should persist customizations to PluresDB', () => {
    const db = makeMockDb();
    const d = createDesignableComponent({
      component: MockComponent,
      database: db as unknown as object,
      componentId: 'test-comp',
    });
    d.setCustomizations({ accent: 'blue' });
    expect(db.get).toHaveBeenCalledWith('design_mode/test-comp');
  });

  it('should accept "gun" as a legacy alias for "database"', () => {
    const db = makeMockDb();
    const d = createDesignableComponent({
      component: MockComponent,
      gun: db as unknown as object,
      componentId: 'test-legacy',
    } as unknown as Parameters<typeof createDesignableComponent>[0]);
    d.setMode('design');
    expect(db.get).toHaveBeenCalledWith('design_mode/test-legacy');
  });

  it('should work without a database (no persistence)', () => {
    const d = createDesignableComponent({ component: MockComponent });
    expect(() => d.setMode('design')).not.toThrow();
    expect(d.getMode()).toBe('design');
  });
});

// ---------------------------------------------------------------------------
// Subscribe / reactive updates
// ---------------------------------------------------------------------------

describe('subscribe', () => {
  it('should call the callback immediately with current config', () => {
    const d = createDesignableComponent({ component: MockComponent });
    const cb = vi.fn();
    d.subscribe(cb);
    expect(cb).toHaveBeenCalledOnce();
    const [cfg] = cb.mock.calls[0];
    expect(cfg.mode).toBe('normal');
  });

  it('should notify subscriber when mode changes', () => {
    const d = createDesignableComponent({ component: MockComponent });
    const cb = vi.fn();
    d.subscribe(cb);
    cb.mockClear();
    d.setMode('design');
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0].mode).toBe('design');
  });

  it('should notify subscriber when customizations change', () => {
    const d = createDesignableComponent({ component: MockComponent });
    const cb = vi.fn();
    d.subscribe(cb);
    cb.mockClear();
    d.setCustomizations({ color: 'red' });
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0].customizations.color).toBe('red');
  });

  it('unsubscribe should stop notifications', () => {
    const d = createDesignableComponent({ component: MockComponent });
    const cb = vi.fn();
    const unsub = d.subscribe(cb);
    cb.mockClear();
    unsub();
    d.toggleMode();
    expect(cb).not.toHaveBeenCalled();
  });

  it('getConfig should return an isolated copy (no mutation of internal state)', () => {
    const d = createDesignableComponent({ component: MockComponent });
    const cfg = d.getConfig();
    cfg.mode = 'design'; // mutate the returned copy
    expect(d.getMode()).toBe('normal'); // internal state must not change
  });
});

// ---------------------------------------------------------------------------
// destroy
// ---------------------------------------------------------------------------

describe('destroy', () => {
  it('should not throw when called without a database', () => {
    const d = createDesignableComponent({ component: MockComponent });
    expect(() => d.destroy()).not.toThrow();
  });

  it('should stop notifying listeners after destroy', () => {
    const d = createDesignableComponent({ component: MockComponent });
    const cb = vi.fn();
    d.subscribe(cb);
    cb.mockClear();
    d.destroy();
    d.setMode('design');
    expect(cb).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Legacy alias
// ---------------------------------------------------------------------------

describe('createGunDesignableComponent (legacy alias)', () => {
  it('should be the same function as createDesignableComponent', () => {
    expect(createGunDesignableComponent).toBe(createDesignableComponent);
  });
});
