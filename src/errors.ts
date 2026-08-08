/**
 * Error propagation for Svelte boundaries with actionable metadata.
 *
 * Provides structured errors that carry enough context for UI components
 * to display meaningful feedback and offer retry/recovery actions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Severity level for an error — determines how the UI should respond. */
export type ErrorSeverity = 'warning' | 'error' | 'fatal';

/** The source layer that produced the error. */
export type ErrorSource = 'adapter' | 'subscription' | 'mutation' | 'query' | 'sync';

/**
 * Actionable metadata attached to every `UnumError`.
 *
 * Svelte components can inspect these fields to render contextual error
 * messages, enable retry buttons, or trigger recovery flows.
 */
export interface UnumErrorMeta {
  /** Which subsystem produced the error */
  source: ErrorSource;
  /** The operation that failed (e.g. 'put', 'on', 'subscribe') */
  operation: string;
  /** DB path relevant to the failure (e.g. 'todos/abc123') */
  path?: string;
  /** Severity — 'warning' can be shown inline, 'fatal' should block UI */
  severity: ErrorSeverity;
  /** Whether the operation can be retried */
  retryable: boolean;
  /** When the error occurred */
  timestamp: number;
  /** Optional structured context for debugging */
  context?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// UnumError class
// ---------------------------------------------------------------------------

/**
 * Structured error class for unum.
 *
 * Extends `Error` with actionable metadata so Svelte components can
 * decide how to present and recover from failures.
 *
 * @example
 * ```ts
 * import { onUnumError } from '@plures/unum';
 *
 * onUnumError((err) => {
 *   if (err.meta.retryable) showRetryToast(err.message);
 *   else showFatalDialog(err.message);
 * });
 * ```
 */
export class UnumError extends Error {
  /** Actionable metadata for the error */
  readonly meta: UnumErrorMeta;

  constructor(message: string, meta: UnumErrorMeta, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'UnumError';
    this.meta = meta;
  }
}

// ---------------------------------------------------------------------------
// Global error handler registry
// ---------------------------------------------------------------------------

/** Callback signature for error handlers */
export type UnumErrorHandler = (error: UnumError) => void;

let _handlers: UnumErrorHandler[] = [];

/**
 * Register a global error handler that receives all `UnumError` instances.
 *
 * Multiple handlers can be registered; they are called in registration order.
 * Returns an unsubscribe function.
 *
 * @param handler - Callback invoked whenever an `UnumError` is emitted.
 * @returns A function that removes this handler when called.
 *
 * @example
 * ```ts
 * import { onUnumError } from '@plures/unum';
 *
 * onUnumError((err) => {
 *   if (err.meta.retryable) showRetryToast(err.message);
 *   else showFatalDialog(err.message);
 * });
 * ```
 */
export function onUnumError(handler: UnumErrorHandler): () => void {
  _handlers.push(handler);
  return () => {
    _handlers = _handlers.filter(h => h !== handler);
  };
}

/**
 * Clear all registered error handlers.
 * Primarily useful in tests.
 */
export function clearErrorHandlers(): void {
  _handlers = [];
}

// ---------------------------------------------------------------------------
// Error boundary (scoped handler)
// ---------------------------------------------------------------------------

/**
 * A scoped error boundary for a subtree of components.
 *
 * Captures errors and exposes reactive `error` / `errors` accessors that
 * Svelte components can read to display contextual error UI.
 *
 * @example
 * ```svelte
 * <script>
 *   import { createErrorBoundary } from '@plures/unum';
 *
 *   const boundary = createErrorBoundary();
 *   // Pass boundary.handler to child components
 * </script>
 *
 * {#if boundary.error}
 *   <p class="error">{boundary.error.message}</p>
 *   {#if boundary.error.meta.retryable}
 *     <button onclick={boundary.clear}>Retry</button>
 *   {/if}
 * {/if}
 * ```
 */
export interface ErrorBoundary {
  /** The most recent error, or null if none. */
  readonly error: UnumError | null;
  /** All captured errors since last `clear()`. */
  readonly errors: readonly UnumError[];
  /** Push an error into this boundary (used internally). */
  handler: UnumErrorHandler;
  /** Clear all captured errors. */
  clear(): void;
  /** Remove the global handler registration. */
  destroy(): void;
}

/**
 * Create a scoped error boundary.
 *
 * @returns An `ErrorBoundary` that captures errors and provides reactive accessors.
 */
export function createErrorBoundary(): ErrorBoundary {
  let errors: UnumError[] = [];

  const handler: UnumErrorHandler = (err) => {
    errors = [...errors, err];
  };

  const unsub = onUnumError(handler);

  return {
    get error() { return errors.length > 0 ? errors[errors.length - 1] : null; },
    get errors() { return errors; },
    handler,
    clear() { errors = []; },
    destroy() { unsub(); errors = []; },
  };
}

// ---------------------------------------------------------------------------
// Internal: emit an error
// ---------------------------------------------------------------------------

/**
 * Emit an `UnumError` to all registered handlers.
 *
 * If no handlers are registered, the error is thrown asynchronously so it
 * surfaces in Svelte's error boundary or window error handlers without
 * breaking the current call stack.
 *
 * @internal
 */
export function emitError(error: UnumError): void {
  if (_handlers.length === 0) {
    // Avoid crashing the app for non-fatal warnings when the consumer hasn't
    // registered any handlers/boundaries yet.
    if (error.meta.severity === 'warning') return;

    queueMicrotask(() => { throw error; });
    return;
  }
  for (const handler of _handlers) {
    try { handler(error); } catch { /* handler errors must not cascade */ }
  }
}

/**
 * Helper to create and emit a `UnumError` in one call.
 *
 * @internal
 */
export function reportError(
  message: string,
  meta: Omit<UnumErrorMeta, 'timestamp'>,
  cause?: unknown,
): UnumError {
  const error = new UnumError(message, { ...meta, timestamp: Date.now() }, cause);
  emitError(error);
  return error;
}
