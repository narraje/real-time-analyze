import { StorageInterface } from './types';

/**
 * SimpleStorage - In-memory storage implementation with subscription support
 * 
 * This storage class provides a simple in-memory key-value store with real-time
 * subscription capabilities. Data is not persisted across application restarts.
 * 
 * @example
 * ```typescript
 * import { SimpleStorage } from 'transcript-monitor-agent';
 * 
 * const storage = new SimpleStorage();
 * 
 * // Subscribe to changes
 * const unsubscribe = storage.subscribe('transcript', (newValue) => {
 *   console.log('Transcript updated:', newValue);
 * });
 * 
 * // Set value (triggers callback)
 * await storage.set('transcript', 'Hello world');
 * 
 * // Get value
 * const value = await storage.get('transcript');
 * console.log('Current value:', value);
 * 
 * // Unsubscribe when done
 * unsubscribe();
 * ```
 */
export class SimpleStorage implements StorageInterface {
  private store = new Map<string, string>();
  private listeners = new Map<string, Set<(value: string) => void>>();

  /**
   * Retrieves a value from storage by key.
   * 
   * @param key - The storage key to retrieve
   * @returns Promise resolving to the stored value (empty string if not found)
   * 
   * @example
   * ```typescript
   * const value = await storage.get('transcript');
   * if (value) {
   *   console.log('Found transcript:', value);
   * } else {
   *   console.log('No transcript found');
   * }
   * ```
   */
  async get(key: string): Promise<string> {
    return this.store.get(key) || '';
  }

  /**
   * Stores a value by key and notifies all subscribers.
   * 
   * @param key - The storage key
   * @param value - The value to store
   * @returns Promise that resolves when the value is stored
   * 
   * @example
   * ```typescript
   * await storage.set('transcript', 'User said hello');
   * console.log('Transcript stored successfully');
   * ```
   */
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
    
    // Notify listeners
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(value));
    }
  }

  /**
   * Subscribes to changes for a specific key.
   * 
   * @param key - The key to watch for changes
   * @param callback - Function called when the value changes
   * @returns Unsubscribe function to stop listening for changes
   * 
   * @example
   * ```typescript
   * const unsubscribe = storage.subscribe('transcript', (newValue) => {
   *   console.log('Transcript changed to:', newValue);
   * });
   * 
   * // Later, when you want to stop listening
   * unsubscribe();
   * ```
   */
  subscribe(key: string, callback: (value: string) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }
}

/**
 * BrowserStorage - Browser localStorage/sessionStorage adapter with cross-tab support
 * 
 * This storage class provides persistent storage using browser APIs with real-time
 * subscription capabilities. Data persists across browser sessions (localStorage)
 * or until the tab is closed (sessionStorage).
 * 
 * @example
 * ```typescript
 * import { BrowserStorage } from 'transcript-monitor-agent';
 * 
 * // Use localStorage (default)
 * const storage = new BrowserStorage();
 * 
 * // Use sessionStorage
 * const sessionStorage = new BrowserStorage(window.sessionStorage);
 * 
 * // Subscribe to changes (works across tabs with localStorage)
 * const unsubscribe = storage.subscribe('transcript', (newValue) => {
 *   console.log('Transcript updated:', newValue);
 * });
 * 
 * // Data persists across browser sessions
 * await storage.set('user-preference', 'dark-mode');
 * ```
 */
export class BrowserStorage implements StorageInterface {
  /**
   * Creates a new BrowserStorage instance.
   * 
   * @param storage - Storage object (localStorage or sessionStorage). Defaults to localStorage if available.
   * @throws {Error} If browser storage is not available
   * 
   * @example
   * ```typescript
   * // Use localStorage (default)
   * const storage = new BrowserStorage();
   * 
   * // Use sessionStorage
   * const sessionStorage = new BrowserStorage(window.sessionStorage);
   * 
   * // Use custom storage implementation
   * const customStorage = new BrowserStorage(myCustomStorageAPI);
   * ```
   */
  constructor(private storage: any = typeof localStorage !== 'undefined' ? localStorage : null) {
    if (!this.storage) {
      throw new Error('Browser storage not available');
    }
  }

  async get(key: string): Promise<string> {
    return this.storage.getItem(key) || '';
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.setItem(key, value);
    
    // Dispatch custom event for same-window updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('transcript-update', {
        detail: { key, value }
      }));
    }
  }

  subscribe(key: string, callback: (value: string) => void): () => void {
    const handler = (e: any) => {
      if (e.detail?.key === key) {
        callback(e.detail.value);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('transcript-update', handler);
      
      return () => {
        window.removeEventListener('transcript-update', handler);
      };
    }
    
    // Return no-op unsubscribe function for non-browser environments
    return () => {};
  }
}