import os from 'node:os';
import { BrowserWindow, powerMonitor } from 'electron';
import { TabManager } from './tabManager';
import { ConfigService } from './configService';

export interface ResourceSample {
  tabId: string;
  memoryMB: number;
  cpuPercent: number;
}

export class ResourceMonitor {
  private intervalHandle?: NodeJS.Timeout;

  constructor(
    private readonly window: BrowserWindow,
    private readonly tabManager: TabManager,
    private readonly configService: ConfigService
  ) {}

  start(): void {
    this.stop();
    const { checkInterval } = this.configService.getConfig().resourceLimits;
    this.intervalHandle = setInterval(() => this.collectAndAct(), checkInterval);

    powerMonitor.on('suspend', () => this.stop());
    powerMonitor.on('resume', () => this.start());
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = undefined;
    }
  }

  private collectAndAct(): void {
    const limits = this.configService.getConfig().resourceLimits;
    // Electron 沒有針對單一 webview 的指標，此處先使用主進程快照佔位
    const memoryUsage = process.getProcessMemoryInfo?.();
    const rss = memoryUsage?.rss ?? 0;
    const rssMB = Math.round(rss / 1024);
    const cpuLoad = os.loadavg()[0] / os.cpus().length * 100;

    if (rssMB > limits.maxMemoryMB || cpuLoad > limits.maxCpuPercent) {
      const snapshot = this.tabManager.getSnapshot();
      const candidate = snapshot.tabs.find((tab) => !tab.isActive);
      if (candidate) {
        this.tabManager.markSuspended(candidate.id);
        this.window.webContents.send('tabs:force-unload', candidate.id);
      }
    }
  }
}
