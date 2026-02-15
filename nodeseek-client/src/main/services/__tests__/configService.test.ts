import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '../configService';

describe('ConfigService', () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
  });

  describe('getConfig', () => {
    it('should return default config', () => {
      const config = configService.getConfig();

      expect(config).toBeDefined();
      expect(config.resourceLimits).toBeDefined();
      expect(config.webdav).toBeDefined();
      expect(config.ui).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.auth).toBeDefined();
      expect(config.session).toBeDefined();
    });

    it('should have correct default values', () => {
      const config = configService.getConfig();

      expect(config.resourceLimits.maxMemoryMB).toBe(500);
      expect(config.resourceLimits.maxCpuPercent).toBe(30);
      expect(config.security.encryptLocalData).toBe(true);
      expect(config.session.shareAcrossTabs).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('should update top-level config', () => {
      const updated = configService.updateConfig({
        ui: {
          theme: 'dark',
          fontSize: 16,
          showLoginStatus: true
        }
      });

      expect(updated.ui.theme).toBe('dark');
      expect(updated.ui.fontSize).toBe(16);
    });

    it('should update nested config', () => {
      const updated = configService.updateConfig({
        resourceLimits: {
          maxMemoryMB: 1000,
          maxCpuPercent: 50,
          checkInterval: 10000
        }
      });

      expect(updated.resourceLimits.maxMemoryMB).toBe(1000);
      expect(updated.resourceLimits.maxCpuPercent).toBe(50);
    });

    it('should merge partial updates', () => {
      const config1 = configService.updateConfig({
        ui: {
          theme: 'dark',
          fontSize: 14,
          showLoginStatus: true
        }
      });

      const config2 = configService.updateConfig({
        ui: {
          theme: 'light',
          fontSize: 14,
          showLoginStatus: true
        }
      });

      expect(config2.ui.theme).toBe('light');
      expect(config2.ui.fontSize).toBe(14);
    });

    it('should persist config across instances', () => {
      configService.updateConfig({
        ui: {
          theme: 'dark',
          fontSize: 18,
          showLoginStatus: false
        }
      });

      const newConfigService = new ConfigService();
      const config = newConfigService.getConfig();

      expect(config.ui.theme).toBe('dark');
      expect(config.ui.fontSize).toBe(18);
    });
  });
});
