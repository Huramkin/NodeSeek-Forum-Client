import Store from 'electron-store';
import { AppConfig } from '../../shared/types/config';
import { defaultConfig } from '../../shared/config/defaults';

const APP_CONFIG_KEY = 'nodeseek-app-config';

export class ConfigService {
  private store: Store<AppConfig>;

  constructor() {
    this.store = new Store<AppConfig>({
      name: APP_CONFIG_KEY,
      defaults: defaultConfig
    });
  }

  getConfig(): AppConfig {
    return this.store.store;
  }

  updateConfig(partial: Partial<AppConfig>): AppConfig {
    const merged = mergeDeep(structuredClone(this.store.store), partial);
    this.store.store = merged;
    return merged;
  }
}

function mergeDeep<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      (target as any)[key] = value;
      return;
    }

    if (typeof value === 'object' && value !== null) {
      (target as any)[key] = mergeDeep((target as any)[key] ?? {}, value);
      return;
    }

    (target as any)[key] = value;
  });
  return target;
}
