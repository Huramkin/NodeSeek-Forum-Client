import { contextBridge, ipcRenderer } from 'electron';
import { IPCChannels } from '@shared/ipcChannels';
import { CreateTabPayload, NavigateTabPayload, TabSnapshot, UpdateTabMetaPayload } from '@shared/types/tabs';
import { AppConfig } from '@shared/types/config';

const tabsApi = {
  list: (): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_LIST),
  create: (payload?: CreateTabPayload): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_CREATE, payload),
  close: (id: string): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_CLOSE, id),
  activate: (id: string): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_ACTIVATE, id),
  navigate: (payload: NavigateTabPayload): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_NAVIGATE, payload),
  updateMeta: (payload: UpdateTabMetaPayload): Promise<TabSnapshot> => ipcRenderer.invoke(IPCChannels.TABS_UPDATE_META, payload),
  onState: (listener: (snapshot: TabSnapshot) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, snapshot: TabSnapshot) => listener(snapshot);
    ipcRenderer.on(IPCChannels.TABS_STATE_PUSH, handler);
    return () => ipcRenderer.removeListener(IPCChannels.TABS_STATE_PUSH, handler);
  },
  onForceUnload: (listener: (id: string) => void): (() => void) => {
    const channel = 'tabs:force-unload';
    const handler = (_: Electron.IpcRendererEvent, id: string) => listener(id);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  }
};

const configApi = {
  get: (): Promise<AppConfig> => ipcRenderer.invoke(IPCChannels.CONFIG_GET),
  update: (partial: Partial<AppConfig>): Promise<AppConfig> => ipcRenderer.invoke(IPCChannels.CONFIG_UPDATE, partial)
};

contextBridge.exposeInMainWorld('electronAPI', {
  tabs: tabsApi,
  config: configApi
});

export type ElectronApi = typeof window.electronAPI;
