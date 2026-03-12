/**
 * unum - Design Mode Support for PluresDB-powered Components
 *
 * Enables applications to switch between normal operation and visual design
 * interfaces, with configuration persisted in PluresDB.
 */

/** @typedef {'normal' | 'design'} DesignModeType */

/**
 * @typedef {Object} DesignTemplates
 * @property {*} normal - Template / component definition for normal mode
 * @property {*} design - Template / component definition for design mode
 */

/**
 * @typedef {Object} DesignConfig
 * @property {DesignModeType} mode - Current active mode
 * @property {DesignTemplates} templates - Mode-specific templates
 * @property {Object} customizations - User-defined modifications
 */

/**
 * @typedef {Object} DesignableComponentOptions
 * @property {Function} component - The Svelte component to wrap
 * @property {Object} database - PluresDB instance (or 'gun' for compatibility)
 * @property {boolean} [designMode=false] - Initial design mode toggle
 * @property {DesignTemplates} [templates] - Mode-specific templates/UI definitions
 * @property {string} [componentId] - Stable identifier for PluresDB persistence
 * @property {Object} [customizations={}] - Initial user customizations
 */

/**
 * Creates a designable component wrapper that supports toggling between normal
 * and design-mode interfaces. Design configuration is persisted in PluresDB so
 * that mode changes and customizations survive page reloads.
 *
 * @example
 * ```javascript
 * import { createDesignableComponent } from 'unum';
 *
 * const designable = createDesignableComponent({
 *   component: MyComponent,
 *   database: pluresDB,
 *   designMode: false,
 *   templates: {
 *     normal: normalTemplate,
 *     design: designTemplate,
 *   },
 * });
 *
 * // Toggle between modes
 * designable.toggleMode();
 *
 * // Set mode explicitly
 * designable.setMode('design');
 *
 * // Read current mode
 * console.log(designable.getMode()); // 'design'
 *
 * // Get the currently active template
 * const template = designable.getTemplate();
 *
 * // Subscribe to config changes
 * const unsub = designable.subscribe((config) => console.log(config));
 *
 * // Persist custom overrides
 * designable.setCustomizations({ theme: 'dark' });
 *
 * // Clean up
 * designable.destroy();
 * ```
 *
 * @param {DesignableComponentOptions} options
 * @returns {Object} Designable component API
 */
/** Auto-incrementing counter used to generate unique default component IDs. */
let _idCounter = 0;

export function createDesignableComponent(options = {}) {
  const {
    component,
    database,
    gun: gunAlias,  // legacy 'gun' alias
    designMode = false,
    templates = { normal: null, design: null },
    componentId = `component_${++_idCounter}`,
    customizations: initialCustomizations = {},
  } = options;

  const db = database || gunAlias;

  // Path in PluresDB where the design config is stored
  const dbPath = `design_mode/${componentId}`;

  /** @type {DesignConfig} */
  let config = {
    mode: designMode ? 'design' : 'normal',
    templates: {
      normal: templates.normal ?? null,
      design: templates.design ?? null,
    },
    customizations: { ...initialCustomizations },
  };

  /** @type {Array<(config: DesignConfig) => void>} */
  let listeners = [];

  /** @type {Function|null} */
  let dbUnsubscribe = null;

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  /** @param {string} mode @returns {boolean} */
  function isValidMode(mode) {
    return mode === 'normal' || mode === 'design';
  }

  function notifyListeners() {
    const snapshot = { ...config, customizations: { ...config.customizations } };
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  /**
   * Persist the current config (mode + customizations) to PluresDB.
   * Templates are intentionally not persisted because they are runtime
   * objects (Svelte component constructors) that cannot be serialised.
   */
  function persistToDb() {
    if (!db) return;

    try {
      db.get(dbPath).put({
        mode: config.mode,
        customizations: JSON.stringify(config.customizations),
      });
    } catch (err) {
      console.error('[unum/designMode] Failed to persist design config:', err);
    }
  }

  /**
   * Subscribe to live PluresDB updates so that mode changes made in another
   * tab / peer are reflected immediately.
   */
  function initDbSubscription() {
    if (!db) return;

    try {
      db.get(dbPath).on((data) => {
        if (!data) return;

        let changed = false;

        const incoming = /** @type {DesignModeType} */ (data.mode);
        if (isValidMode(incoming)) {
          if (config.mode !== incoming) {
            config = { ...config, mode: incoming };
            changed = true;
          }
        }

        if (data.customizations) {
          try {
            const parsed =
              typeof data.customizations === 'string'
                ? JSON.parse(data.customizations)
                : data.customizations;
            config = { ...config, customizations: { ...parsed } };
            changed = true;
          } catch {
            // ignore malformed JSON
          }
        }

        if (changed) notifyListeners();
      });

      dbUnsubscribe = () => {
        try {
          db.get(dbPath).off();
        } catch {
          // ignore
        }
      };
    } catch (err) {
      console.error('[unum/designMode] Failed to set up PluresDB subscription:', err);
    }
  }

  // Boot
  initDbSubscription();

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  return {
    /** The wrapped Svelte component (unchanged). */
    component,

    /**
     * Returns the current design config snapshot.
     * @returns {DesignConfig}
     */
    getConfig() {
      return { ...config, customizations: { ...config.customizations } };
    },

    /**
     * Returns the currently active mode.
     * @returns {DesignModeType}
     */
    getMode() {
      return config.mode;
    },

    /**
     * Returns the template for the currently active mode.
     * @returns {*}
     */
    getTemplate() {
      return config.templates[config.mode] ?? null;
    },

    /**
     * Explicitly sets the active mode and persists the change.
     * @param {DesignModeType} mode
     */
    setMode(mode) {
      if (!isValidMode(mode)) {
        console.warn(`[unum/designMode] Unknown mode "${mode}". Use 'normal' or 'design'.`);
        return;
      }
      if (config.mode === mode) return;

      config = { ...config, mode };
      persistToDb();
      notifyListeners();
    },

    /**
     * Toggles between 'normal' and 'design' modes.
     */
    toggleMode() {
      this.setMode(config.mode === 'normal' ? 'design' : 'normal');
    },

    /**
     * Merges additional customizations into the current set and persists.
     * @param {Object} updates
     */
    setCustomizations(updates) {
      config = {
        ...config,
        customizations: { ...config.customizations, ...updates },
      };
      persistToDb();
      notifyListeners();
    },

    /**
     * Replaces the template for a given mode at runtime.
     * Templates are not persisted to PluresDB (they are runtime objects).
     * @param {DesignModeType} mode
     * @param {*} template
     */
    setTemplate(mode, template) {
      config = {
        ...config,
        templates: { ...config.templates, [mode]: template },
      };
      notifyListeners();
    },

    /**
     * Subscribes to config changes.  The callback is called immediately with
     * the current config and on every subsequent change.
     *
     * @param {(config: DesignConfig) => void} callback
     * @returns {() => void} Unsubscribe function
     */
    subscribe(callback) {
      listeners.push(callback);
      callback({ ...config, customizations: { ...config.customizations } });
      return () => {
        listeners = listeners.filter((l) => l !== callback);
      };
    },

    /**
     * Tears down PluresDB subscriptions and clears all listeners.
     */
    destroy() {
      if (dbUnsubscribe) {
        dbUnsubscribe();
        dbUnsubscribe = null;
      }
      listeners = [];
    },
  };
}

// Legacy alias
export const createGunDesignableComponent = createDesignableComponent;
