import { vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';

// Mock Electron app module
vi.mock('electron', () => {
  return {
    app: {
      getPath: vi.fn((name: string) => {
        // Return temporary directory for userData
        if (name === 'userData') {
          return path.join(os.tmpdir(), 'electron-test-userdata');
        }
        return os.tmpdir();
      }),
      getAppPath: vi.fn(() => {
        // Return the project root for appPath
        return path.resolve(__dirname, '../../../..');
      })
    },
    BrowserWindow: vi.fn(),
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn()
    },
    session: {
      fromPartition: vi.fn(() => ({
        cookies: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn(),
          flushStore: vi.fn()
        }
      }))
    },
    nativeTheme: {
      shouldUseDarkColors: false
    }
  };
});

// Mock keytar for AuthManager tests
vi.mock('keytar', () => {
  const store = new Map<string, string>();
  
  return {
    default: {
      setPassword: vi.fn(async (service: string, account: string, password: string) => {
        store.set(`${service}:${account}`, password);
      }),
      getPassword: vi.fn(async (service: string, account: string) => {
        return store.get(`${service}:${account}`) || null;
      }),
      deletePassword: vi.fn(async (service: string, account: string) => {
        store.delete(`${service}:${account}`);
        return true;
      }),
      findCredentials: vi.fn(async (service: string) => {
        const results: Array<{ account: string; password: string }> = [];
        for (const [key, password] of store.entries()) {
          if (key.startsWith(`${service}:`)) {
            const account = key.substring(service.length + 1);
            results.push({ account, password });
          }
        }
        return results;
      })
    }
  };
});

// Mock electron-store with shared storage between instances
vi.mock('electron-store', () => {
  // Shared storage across all Store instances
  const sharedStores = new Map<string, any>();

  return {
    default: class Store {
      private data = new Map<string, any>();
      private storeName: string;

      constructor(options?: any) {
        this.storeName = options?.name || 'default';
        
        // Initialize shared store with defaults if not exists
        if (!sharedStores.has(this.storeName)) {
          sharedStores.set(
            this.storeName,
            options?.defaults ? structuredClone(options.defaults) : {}
          );
        }
      }

      get store(): any {
        return sharedStores.get(this.storeName) || {};
      }

      set store(value: any) {
        sharedStores.set(this.storeName, value);
      }

      get(key: string): any {
        return this.data.get(key);
      }

      set(key: string, value: any): void {
        this.data.set(key, value);
      }

      delete(key: string): void {
        this.data.delete(key);
      }

      clear(): void {
        this.data.clear();
      }

      has(key: string): boolean {
        return this.data.has(key);
      }
    }
  };
});
