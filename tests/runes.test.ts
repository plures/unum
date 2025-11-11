import { describe, it, expect, vi, beforeEach } from 'vitest';

// These tests just verify the module loads correctly
// Full integration tests would require a real PluresDB/Gun instance

describe('runes module', () => {
  it('should export pluresData function', async () => {
    const module = await import('../src/runes.js');
    expect(module.pluresData).toBeDefined();
    expect(typeof module.pluresData).toBe('function');
  });

  it('should export pluresDerived function', async () => {
    const module = await import('../src/runes.js');
    expect(module.pluresDerived).toBeDefined();
    expect(typeof module.pluresDerived).toBe('function');
  });

  it('should export pluresBind function', async () => {
    const module = await import('../src/runes.js');
    expect(module.pluresBind).toBeDefined();
    expect(typeof module.pluresBind).toBe('function');
  });

  it('should export legacy gunData as alias', async () => {
    const module = await import('../src/runes.js');
    expect(module.gunData).toBeDefined();
    expect(module.gunData).toBe(module.pluresData);
  });

  it('should export legacy gunDerived as alias', async () => {
    const module = await import('../src/runes.js');
    expect(module.gunDerived).toBeDefined();
    expect(module.gunDerived).toBe(module.pluresDerived);
  });

  it('should export legacy gunBind as alias', async () => {
    const module = await import('../src/runes.js');
    expect(module.gunBind).toBeDefined();
    expect(module.gunBind).toBe(module.pluresBind);
  });
});