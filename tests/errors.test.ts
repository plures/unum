/**
 * Tests for src/errors.ts — UnumError, onUnumError, createErrorBoundary, reportError
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDb, destroyDb } from '../src/context';
import { createMemoryAdapter } from '../src/adapters/memory';
import { pluresData } from '../src/runes';
import { createCollection } from '../src/collection';
import {
  UnumError,
  onUnumError,
  createErrorBoundary,
  clearErrorHandlers,
  reportError,
} from '../src/errors';

describe('UnumError', () => {
  it('extends Error with meta', () => {
    const err = new UnumError('test', {
      source: 'adapter',
      operation: 'put',
      path: 'todos/1',
      severity: 'error',
      retryable: true,
      timestamp: Date.now(),
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('UnumError');
    expect(err.meta.source).toBe('adapter');
    expect(err.meta.retryable).toBe(true);
    expect(err.meta.path).toBe('todos/1');
  });

  it('preserves cause', () => {
    const cause = new Error('root cause');
    const err = new UnumError('wrapped', {
      source: 'mutation',
      operation: 'put',
      severity: 'error',
      retryable: false,
      timestamp: Date.now(),
    }, cause);
    expect(err.cause).toBe(cause);
  });
});

describe('onUnumError', () => {
  afterEach(() => clearErrorHandlers());

  it('registers and invokes handler', () => {
    const errors: UnumError[] = [];
    onUnumError((err) => errors.push(err));
    reportError('fail', { source: 'adapter', operation: 'on', severity: 'error', retryable: false });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('fail');
  });

  it('unsubscribe removes handler', () => {
    const errors: UnumError[] = [];
    const unsub = onUnumError((err) => errors.push(err));
    unsub();
    reportError('ignored', { source: 'adapter', operation: 'on', severity: 'error', retryable: false });
    expect(errors).toHaveLength(0);
  });

  it('multiple handlers are called in order', () => {
    const calls: number[] = [];
    onUnumError(() => calls.push(1));
    onUnumError(() => calls.push(2));
    reportError('x', { source: 'query', operation: 'select', severity: 'warning', retryable: false });
    expect(calls).toEqual([1, 2]);
  });
});

describe('createErrorBoundary', () => {
  afterEach(() => clearErrorHandlers());

  it('captures errors in .error and .errors', () => {
    const boundary = createErrorBoundary();
    reportError('oops', { source: 'subscription', operation: 'notify', severity: 'error', retryable: true });
    expect(boundary.error).not.toBeNull();
    expect(boundary.error!.message).toBe('oops');
    expect(boundary.errors).toHaveLength(1);
    boundary.destroy();
  });

  it('clear() resets errors', () => {
    const boundary = createErrorBoundary();
    reportError('err1', { source: 'adapter', operation: 'put', severity: 'error', retryable: false });
    boundary.clear();
    expect(boundary.error).toBeNull();
    expect(boundary.errors).toHaveLength(0);
    boundary.destroy();
  });

  it('destroy() stops capturing', () => {
    const boundary = createErrorBoundary();
    boundary.destroy();
    reportError('late', { source: 'adapter', operation: 'on', severity: 'error', retryable: false });
    expect(boundary.errors).toHaveLength(0);
  });
});

describe('Error propagation integration', () => {
  beforeEach(() => {
    initDb(createMemoryAdapter());
  });
  afterEach(() => {
    destroyDb();
    clearErrorHandlers();
  });

  it('pluresData emits error when subscriber throws', () => {
    const captured: UnumError[] = [];
    onUnumError((err) => captured.push(err));

    const data = pluresData('test-path');
    data.subscribe(() => { throw new Error('subscriber boom'); });

    // Trigger notify via add
    data.add({ title: 'hi' });

    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].meta.source).toBe('subscription');
    expect(captured[0].meta.operation).toBe('notify');
    expect(captured[0].meta.path).toBe('test-path');
    data.destroy();
  });

  it('createCollection emits error when subscriber throws', () => {
    const captured: UnumError[] = [];
    onUnumError((err) => captured.push(err));

    const col = createCollection('col-path');
    // Add a throwing subscriber
    col.subscribe(() => { throw new Error('col boom'); });

    // Trigger notify via add
    col.add({ x: 1 });

    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].meta.source).toBe('subscription');
    expect(captured[0].meta.path).toBe('col-path');
    col.destroy();
  });
});
