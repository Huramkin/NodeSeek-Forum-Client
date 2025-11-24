export const IPCChannels = {
  TABS_CREATE: 'tabs:create',
  TABS_CLOSE: 'tabs:close',
  TABS_ACTIVATE: 'tabs:activate',
  TABS_LIST: 'tabs:list',
  TABS_UPDATE_META: 'tabs:update-meta',
  TABS_NAVIGATE: 'tabs:navigate',
  TABS_RELOAD: 'tabs:reload',
  TABS_FORCE_UNLOAD: 'tabs:force-unload',
  TABS_STATE_PUSH: 'tabs:state',
  CONFIG_GET: 'config:get',
  CONFIG_UPDATE: 'config:update'
} as const;

export type IPCChannel = (typeof IPCChannels)[keyof typeof IPCChannels];
