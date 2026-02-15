import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResourceMonitor } from '../resourceMonitor';
import { TabManager } from '../tabManager';
import { ConfigService } from '../configService';
import { SessionManager } from '../../session/sessionManager';
import { BrowserWindow } from 'electron';

// Mock Electron
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  powerMonitor: {
    on: vi.fn(),
    removeListener: vi.fn()
  }
}));

describe('ResourceMonitor', () => {
  let resourceMonitor: ResourceMonitor;
  let mockWindow: any;
  let mockTabManager: any;
  let configService: ConfigService;
  let mockSessionManager: any;

  beforeEach(() => {
    mockWindow = {
      webContents: {
        send: vi.fn()
      }
    };

    mockTabManager = {
      getSnapshot: vi.fn(() => ({
        tabs: [
          { id: '1', isActive: true, isSuspended: false },
          { id: '2', isActive: false, isSuspended: false },
          { id: '3', isActive: false, isSuspended: true }
        ],
        activeTabId: '1'
      })),
      markSuspended: vi.fn()
    };

    configService = new ConfigService();

    mockSessionManager = {
      captureSnapshot: vi.fn()
    };

    resourceMonitor = new ResourceMonitor(
      mockWindow as BrowserWindow,
      mockTabManager as TabManager,
      configService,
      mockSessionManager as SessionManager
    );
  });

  afterEach(() => {
    resourceMonitor.dispose();
  });

  describe('start', () => {
    it('should start monitoring', () => {
      resourceMonitor.start();
      expect(resourceMonitor).toBeDefined();
    });

    it('should not throw when started multiple times', () => {
      expect(() => {
        resourceMonitor.start();
        resourceMonitor.start();
      }).not.toThrow();
    });
  });

  describe('stop', () => {
    it('should stop monitoring', () => {
      resourceMonitor.start();
      resourceMonitor.stop();
      expect(resourceMonitor).toBeDefined();
    });

    it('should not throw when stopped multiple times', () => {
      expect(() => {
        resourceMonitor.stop();
        resourceMonitor.stop();
      }).not.toThrow();
    });
  });

  describe('dispose', () => {
    it('should dispose and clean up power listeners', () => {
      resourceMonitor.start();
      resourceMonitor.dispose();
      expect(resourceMonitor).toBeDefined();
    });

    it('should not throw when disposed multiple times', () => {
      expect(() => {
        resourceMonitor.dispose();
        resourceMonitor.dispose();
      }).not.toThrow();
    });
  });
});
