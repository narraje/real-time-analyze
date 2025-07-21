import { StorageInterface } from './types';

export class SimpleStorage implements StorageInterface {
  private store = new Map<string, string>();
  private listeners = new Map<string, Set<(value: string) => void>>();

  async get(key: string): Promise<string> {
    return this.store.get(key) || '';
  }

  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
    
    // Notify listeners
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(cb => cb(value));
    }
  }

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

// Browser storage adapter
export class BrowserStorage implements StorageInterface {
  constructor(private storage: Storage = localStorage) {}

  async get(key: string): Promise<string> {
    return this.storage.getItem(key) || '';
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.setItem(key, value);
    
    // Dispatch custom event for same-window updates
    window.dispatchEvent(new CustomEvent('transcript-update', {
      detail: { key, value }
    }));
  }

  subscribe(key: string, callback: (value: string) => void): () => void {
    const handler = (e: any) => {
      if (e.detail?.key === key) {
        callback(e.detail.value);
      }
    };
    
    window.addEventListener('transcript-update', handler);
    
    return () => {
      window.removeEventListener('transcript-update', handler);
    };
  }
}