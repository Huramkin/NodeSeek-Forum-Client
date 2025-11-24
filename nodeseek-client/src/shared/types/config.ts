export interface ResourceLimitConfig {
  maxMemoryMB: number;
  maxCpuPercent: number;
  checkInterval: number;
}

export interface WebDavConfig {
  url: string;
  username: string;
  password: string;
  syncInterval: number;
}

export interface UiConfig {
  theme: 'light' | 'dark';
  fontSize: number;
  showLoginStatus: boolean;
}

export interface SecurityConfig {
  encryptLocalData: boolean;
  autoLockTimeout: number;
}

export interface AuthConfig {
  loginUrl: string;
  sessionTimeout: number;
  autoRefresh: boolean;
  encryptStorage: boolean;
}

export interface SessionConfig {
  cookieDomain: string;
  persistCookies: boolean;
  shareAcrossTabs: boolean;
}

export interface AppConfig {
  resourceLimits: ResourceLimitConfig;
  webdav: WebDavConfig;
  ui: UiConfig;
  security: SecurityConfig;
  auth: AuthConfig;
  session: SessionConfig;
}
