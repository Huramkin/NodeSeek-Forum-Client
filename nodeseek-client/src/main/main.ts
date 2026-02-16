import path from 'node:path';
import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { IPCChannels } from '@shared/ipcChannels';
import {
  CreateTabPayload,
  NavigateTabPayload,
  ReloadTabPayload,
  UpdateTabMetaPayload
} from '@shared/types/tabs';
import { TabManager } from './services/tabManager';
import { ConfigService } from './services/configService';
import { ResourceMonitor } from './services/resourceMonitor';
import { SessionManager } from './session/sessionManager';
import { AuthManager } from './auth/authManager';
import { BookmarkManager } from './services/bookmarkManager';
import {
  BookmarkInput,
  BookmarkSearchPayload,
  BookmarkUpdatePayload,
  BookmarkFolderInput,
  BookmarkFolderUpdatePayload,
  BatchBookmarkOperation
} from '@shared/types/bookmarks';

let mainWindow: BrowserWindow | null = null;
let tabManager: TabManager;
let configService: ConfigService;
let resourceMonitor: ResourceMonitor;
let sessionManager: SessionManager;
let authManager: AuthManager;
let bookmarkManager: BookmarkManager;
let ipcHandlersRegistered = false;

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

const createWindow = async (): Promise<void> => {
  if (!configService) {
    configService = new ConfigService();
  }
  if (!sessionManager) {
    sessionManager = new SessionManager(configService);
  }
  if (!authManager) {
    authManager = new AuthManager(configService);
  }
  if (!bookmarkManager) {
    bookmarkManager = new BookmarkManager(configService);
  }

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
  resourceMonitor = new ResourceMonitor(mainWindow, tabManager, configService, sessionManager);

  tabManager.on('state-changed', (snapshot) => {
    mainWindow?.webContents.send(IPCChannels.TABS_STATE_PUSH, snapshot);
  });

  // Register IPC handlers BEFORE loading the page so the renderer
  // can call tabs.list() as soon as it mounts.
  if (!ipcHandlersRegistered) {
    registerIpcHandlers();
    ipcHandlersRegistered = true;
  }

  const pageUrl = isDev
    ? process.env.VITE_DEV_SERVER_URL!
    : `file://${path.join(__dirname, '../renderer/index.html')}`;

  await mainWindow.loadURL(pageUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  resourceMonitor.start();
};

const registerIpcHandlers = (): void => {
  ipcMain.handle(IPCChannels.TABS_CREATE, (_, payload: CreateTabPayload) => tabManager.createTab(payload));
  ipcMain.handle(IPCChannels.TABS_LIST, () => tabManager.getSnapshot());
  ipcMain.handle(IPCChannels.TABS_CLOSE, (_, tabId: string) => {
    sessionManager.dropSnapshot(tabId);
    return tabManager.closeTab(tabId);
  });
  ipcMain.handle(IPCChannels.TABS_ACTIVATE, (_, tabId: string) => tabManager.setActiveTab(tabId));
  ipcMain.handle(IPCChannels.TABS_NAVIGATE, (_, payload: NavigateTabPayload) =>
    tabManager.navigateTab(payload.id, payload.url)
  );
  ipcMain.handle(IPCChannels.TABS_UPDATE_META, (_, payload: UpdateTabMetaPayload) =>
    tabManager.updateTabMeta(payload)
  );
  ipcMain.handle(IPCChannels.TABS_REFRESH, async (_, payload: ReloadTabPayload) => {
    if (!payload?.id) {
      return tabManager.getSnapshot();
    }
    if (payload.reason !== 'resource-monitor' && payload.reason !== 'resume') {
      await sessionManager.captureSnapshot(payload.id);
    }
    await sessionManager.restoreSnapshot(payload.id);
    const snapshot = tabManager.resumeTab(payload.id);
    const tab = tabManager.getTab(payload.id);
    mainWindow?.webContents.send(IPCChannels.TABS_RELOAD, {
      id: payload.id,
      url: payload.url ?? tab?.url,
      mode: payload.mode ?? 'soft',
      reason: payload.reason ?? 'user'
    });
    return snapshot;
  });
  ipcMain.handle(IPCChannels.CONFIG_GET, () => configService.getConfig());
  ipcMain.handle(IPCChannels.CONFIG_UPDATE, async (_, partial: any) => {
    const merged = configService.updateConfig(partial);
    await bookmarkManager.refreshWebDavClient();
    return merged;
  });
  ipcMain.handle(IPCChannels.BOOKMARK_LIST, (_, accountId: number) =>
    bookmarkManager.listBookmarks(accountId)
  );
  ipcMain.handle(IPCChannels.BOOKMARK_ADD, (_, payload: BookmarkInput) =>
    bookmarkManager.addBookmark(payload)
  );
  ipcMain.handle(IPCChannels.BOOKMARK_UPDATE, (_, payload: BookmarkUpdatePayload) =>
    bookmarkManager.updateBookmark(payload)
  );
  ipcMain.handle(IPCChannels.BOOKMARK_DELETE, (_, id: number) => bookmarkManager.deleteBookmark(id));
  ipcMain.handle(IPCChannels.BOOKMARK_SEARCH, (_, payload: BookmarkSearchPayload) =>
    bookmarkManager.search(payload)
  );
  ipcMain.handle(IPCChannels.BOOKMARK_SYNC, () => bookmarkManager.triggerManualSync());
  ipcMain.handle(IPCChannels.BOOKMARK_INCREMENT_VISIT, (_, id: number) =>
    bookmarkManager.incrementVisitCount(id)
  );
  ipcMain.handle(IPCChannels.BOOKMARK_BATCH, (_, payload: BatchBookmarkOperation) =>
    bookmarkManager.batchOperation(payload)
  );
  ipcMain.handle(IPCChannels.FOLDER_LIST, (_, accountId: number) => bookmarkManager.listFolders(accountId));
  ipcMain.handle(IPCChannels.FOLDER_CREATE, (_, payload: BookmarkFolderInput) =>
    bookmarkManager.createFolder(payload)
  );
  ipcMain.handle(IPCChannels.FOLDER_UPDATE, (_, payload: BookmarkFolderUpdatePayload) =>
    bookmarkManager.updateFolder(payload)
  );
  ipcMain.handle(IPCChannels.FOLDER_DELETE, (_, id: number, moveToFolder?: number) =>
    bookmarkManager.deleteFolder(id, moveToFolder)
  );
  ipcMain.handle(IPCChannels.AUTH_LOGIN, async (_, username: string, password: string) => {
    const accountId = `account_${Date.now()}`;
    await authManager.saveCredential({
      id: accountId,
      username,
      password,
      displayName: username
    });
    return { success: true, accountId, username };
  });
  ipcMain.handle(IPCChannels.AUTH_LOGOUT, async (_, accountId: string) => {
    await authManager.deleteCredential(accountId);
    return { success: true };
  });
  ipcMain.handle(IPCChannels.AUTH_GET_CURRENT, async () => {
    const accounts = await authManager.listCredentials();
    return accounts.length > 0 ? accounts[0] : null;
  });
  ipcMain.handle(IPCChannels.AUTH_LIST_ACCOUNTS, () => authManager.listCredentials());
};

app
  .whenReady()
  .then(createWindow)
  .catch((error) => {
    console.error('[main] failed to create window', error);
    app.quit();
  });

app.on('before-quit', () => {
  resourceMonitor?.dispose();
  bookmarkManager?.dispose();
  tabManager?.dispose();
  sessionManager?.dispose();
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
