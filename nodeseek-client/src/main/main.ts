import path from 'node:path';
import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { IPCChannels } from '@shared/ipcChannels';
import { CreateTabPayload, NavigateTabPayload, UpdateTabMetaPayload } from '@shared/types/tabs';
import { TabManager } from './services/tabManager';
import { ConfigService } from './services/configService';
import { ResourceMonitor } from './services/resourceMonitor';
import { SessionManager } from './session/sessionManager';
import { AuthManager } from './auth/authManager';
import { BookmarkManager } from './services/bookmarkManager';

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager;
let configService: ConfigService;
let resourceMonitor: ResourceMonitor;
let sessionManager: SessionManager;
let authManager: AuthManager;
let bookmarkManager: BookmarkManager;

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

const createWindow = async (): Promise<void> => {
  configService = new ConfigService();
  sessionManager = new SessionManager(configService.getConfig());
  authManager = new AuthManager(configService.getConfig());
  bookmarkManager = new BookmarkManager();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 720,
    title: 'NodeSeek DeepFlood',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1c1c' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      spellcheck: false
    }
  });

  tabManager = new TabManager(mainWindow);
  resourceMonitor = new ResourceMonitor(mainWindow, tabManager, configService);

  tabManager.on('state-changed', (snapshot) => {
    mainWindow?.webContents.send(IPCChannels.TABS_STATE_PUSH, snapshot);
  });

  const pageUrl = isDev
    ? process.env.VITE_DEV_SERVER_URL!
    : `file://${path.join(__dirname, '../renderer/index.html')}`;

  await mainWindow.loadURL(pageUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  resourceMonitor.start();
  registerIpcHandlers();
};

const registerIpcHandlers = (): void => {
  ipcMain.handle(IPCChannels.TABS_CREATE, (_, payload: CreateTabPayload) => tabManager.createTab(payload));
  ipcMain.handle(IPCChannels.TABS_LIST, () => tabManager.getSnapshot());
  ipcMain.handle(IPCChannels.TABS_CLOSE, (_, tabId: string) => tabManager.closeTab(tabId));
  ipcMain.handle(IPCChannels.TABS_ACTIVATE, (_, tabId: string) => tabManager.setActiveTab(tabId));
  ipcMain.handle(IPCChannels.TABS_NAVIGATE, (_, payload: NavigateTabPayload) => tabManager.navigateTab(payload.id, payload.url));
  ipcMain.handle(IPCChannels.TABS_UPDATE_META, (_, payload: UpdateTabMetaPayload) => tabManager.updateTabMeta(payload));
  ipcMain.handle(IPCChannels.CONFIG_GET, () => configService.getConfig());
  ipcMain.handle(IPCChannels.CONFIG_UPDATE, (_, partial: any) => configService.updateConfig(partial));
};

app.whenReady().then(createWindow).catch((error) => {
  console.error('[main] failed to create window', error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
