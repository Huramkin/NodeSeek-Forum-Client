import { AppConfig } from '../types/config';

export const defaultConfig: AppConfig = {
  resourceLimits: {
    maxMemoryMB: 500,
    maxCpuPercent: 30,
    checkInterval: 5000
  },
  webdav: {
    url: '',
    username: '',
    password: '',
    syncInterval: 300000
  },
  ui: {
    theme: 'light',
    fontSize: 14,
    showLoginStatus: true
  },
  security: {
    encryptLocalData: true,
    autoLockTimeout: 1800000
  },
  auth: {
    loginUrl: 'https://nodeseek.com/login',
    sessionTimeout: 3600000,
    autoRefresh: true,
    encryptStorage: true
  },
  session: {
    cookieDomain: '.nodeseek.com',
    persistCookies: true,
    shareAcrossTabs: true
  }
};
