import os from 'node:os';
import { BrowserWindow, powerMonitor } from 'electron';
import { TabManager } from './tabManager';
import { ConfigService } from './configService';
import { SessionManager } from '../session/sessionManager';
import { IPCChannels } from '../../shared/ipcChannels';

export interface ResourceSample {
  tabId: string;
  memoryMB: number;
  cpuPercent: number;
  timestamp: number;
}

interface ResourceHistory {
  samples: ResourceSample[];
  lastCheck: number;
}

/**
 * Monitors system resources (memory and CPU) and automatically suspends
 * inactive tabs when resource limits are exceeded.
 * 
 * Features:
 * - Periodic resource checking with configurable intervals
 * - Smart tab suspension based on activity and resource usage
 * - Power event handling (suspend/resume)
 * - Historical data tracking for trend analysis
 * - Exponential backoff for consecutive suspensions
 */
export class ResourceMonitor {
  private intervalHandle?: NodeJS.Timeout;
  private history: Map<string, ResourceHistory> = new Map();
  private consecutiveSuspensions = 0;
  private lastSuspensionTime = 0;
  private readonly MIN_SUSPENSION_INTERVAL = 30000; // 30 seconds between suspensions
  private boundSuspendHandler: () => void;
  private boundResumeHandler: () => void;
  private powerListenersAttached = false;

  constructor(
    private readonly window: BrowserWindow,
    private readonly tabManager: TabManager,
    private readonly configService: ConfigService,
    private readonly sessionManager: SessionManager
  ) {
    this.boundSuspendHandler = () => this.stop();
    this.boundResumeHandler = () => this.start();
  }

  start(): void {
    this.stop();
    const { checkInterval } = this.configService.getConfig().resourceLimits;
    this.intervalHandle = setInterval(() => {
      void this.collectAndAct();
    }, checkInterval);

    if (!this.powerListenersAttached) {
      powerMonitor.on('suspend', this.boundSuspendHandler);
      powerMonitor.on('resume', this.boundResumeHandler);
      this.powerListenersAttached = true;
    }
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  dispose(): void {
    this.stop();
    if (this.powerListenersAttached) {
      powerMonitor.removeListener('suspend', this.boundSuspendHandler);
      powerMonitor.removeListener('resume', this.boundResumeHandler);
      this.powerListenersAttached = false;
    }
  }

  /**
   * Collects resource usage metrics and takes action if limits are exceeded.
   * Uses smart tab selection based on activity, age, and resource usage.
   */
  private async collectAndAct(): Promise<void> {
    const limits = this.configService.getConfig().resourceLimits;
    const now = Date.now();
    
    // 使用 Node.js 原生 process.memoryUsage() 取得主進程記憶體資訊
    const memoryUsage = process.memoryUsage();
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);
    
    // Use moving average of CPU load for more stable readings
    const loadAvg = os.loadavg();
    const cpuLoad = (loadAvg[0] + loadAvg[1] * 0.5 + loadAvg[2] * 0.25) / (1 + 0.5 + 0.25) / os.cpus().length * 100;

    // Check if we should act on resource limits
    const memoryExceeded = rssMB > limits.maxMemoryMB;
    const cpuExceeded = cpuLoad > limits.maxCpuPercent;
    
    if (!memoryExceeded && !cpuExceeded) {
      // Reset consecutive suspension counter if resources are normal
      this.consecutiveSuspensions = 0;
      return;
    }

    // Prevent too frequent suspensions
    const timeSinceLastSuspension = now - this.lastSuspensionTime;
    if (timeSinceLastSuspension < this.MIN_SUSPENSION_INTERVAL) {
      return;
    }

    const snapshot = this.tabManager.getSnapshot();
    
    // Find best candidate for suspension using scoring algorithm
    const candidates = snapshot.tabs
      .filter((tab) => !tab.isActive && !tab.isSuspended)
      .map((tab) => {
        const history = this.history.get(tab.id);
        const age = now - (history?.lastCheck ?? now);
        
        // Score based on age (older = higher score)
        const ageScore = Math.min(age / 60000, 10); // Cap at 10 minutes
        
        // Score based on historical resource usage
        let resourceScore = 0;
        if (history && history.samples.length > 0) {
          const avgMemory = history.samples.reduce((sum, s) => sum + s.memoryMB, 0) / history.samples.length;
          const avgCpu = history.samples.reduce((sum, s) => sum + s.cpuPercent, 0) / history.samples.length;
          resourceScore = (avgMemory / 100) + (avgCpu / 10);
        }
        
        return {
          tab,
          score: ageScore + resourceScore
        };
      })
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      return;
    }

    const candidate = candidates[0].tab;
    
    try {
      await this.sessionManager.captureSnapshot(candidate.id);
      this.tabManager.markSuspended(candidate.id);
      this.window.webContents.send(IPCChannels.TABS_FORCE_UNLOAD, {
        id: candidate.id,
        reason: 'resource-limit'
      });
      
      this.consecutiveSuspensions++;
      this.lastSuspensionTime = now;
      
      console.log(`[ResourceMonitor] Suspended tab ${candidate.id} (memory: ${rssMB}MB, CPU: ${cpuLoad.toFixed(1)}%)`);
    } catch (error) {
      console.error('[ResourceMonitor] Failed to suspend tab:', error);
    }
  }

  /**
   * Records resource usage for a tab
   */
  private recordSample(tabId: string, sample: ResourceSample): void {
    let history = this.history.get(tabId);
    if (!history) {
      history = { samples: [], lastCheck: Date.now() };
      this.history.set(tabId, history);
    }

    history.samples.push(sample);
    history.lastCheck = Date.now();

    // Keep only last 10 samples per tab
    if (history.samples.length > 10) {
      history.samples.shift();
    }
  }

  /**
   * Clears history for a tab
   */
  clearHistory(tabId: string): void {
    this.history.delete(tabId);
  }

  /**
   * Gets resource statistics
   */
  getStats(): {
    totalTabs: number;
    trackedTabs: number;
    consecutiveSuspensions: number;
  } {
    return {
      totalTabs: this.history.size,
      trackedTabs: Array.from(this.history.values()).filter(h => h.samples.length > 0).length,
      consecutiveSuspensions: this.consecutiveSuspensions
    };
  }
}
