import { BrowserWindow } from 'electron';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import Store from 'electron-store';
import { CreateTabPayload, TabMetadata, TabSnapshot, UpdateTabMetaPayload } from '../../shared/types/tabs';

export interface TabManagerEvents {
  'state-changed': (snapshot: TabSnapshot) => void;
}

type EventKeys = keyof TabManagerEvents;

interface TabState {
  tabs: TabMetadata[];
  activeTabId: string | null;
}

export class TabManager extends EventEmitter {
  private tabs = new Map<string, TabMetadata>();
  private activeTabId: string | null = null;
  private browserWindow: BrowserWindow;
  private store: Store;
  private saveTimer?: NodeJS.Timeout;

  constructor(window: BrowserWindow) {
    super();
    this.browserWindow = window;
    this.store = new Store({
      name: 'tab-state'
    });
    
    // Restore tabs from previous session
    this.restoreTabs();
  }

  /**
   * Restore tabs from persisted state
   */
  private restoreTabs(): void {
    try {
      const savedState = this.store.get('tabState') as TabState | undefined;
      
      if (savedState && savedState.tabs && savedState.tabs.length > 0) {
        // Restore saved tabs
        for (const tab of savedState.tabs) {
          // Reset loading and active states
          tab.isLoading = false;
          tab.isActive = false;
          this.tabs.set(tab.id, tab);
        }
        
        // Restore active tab
        if (savedState.activeTabId && this.tabs.has(savedState.activeTabId)) {
          this.activeTabId = savedState.activeTabId;
          const activeTab = this.tabs.get(savedState.activeTabId);
          if (activeTab) {
            activeTab.isActive = true;
          }
        } else if (this.tabs.size > 0) {
          // If no valid active tab, activate the first one
          const firstTab = savedState.tabs[0];
          this.activeTabId = firstTab.id;
          firstTab.isActive = true;
        }
        
        console.log(`[TabManager] Restored ${this.tabs.size} tabs from previous session`);
      } else {
        // No saved state, create default tab
        this.createTab({ url: 'https://nodeseek.com/' });
      }
    } catch (error) {
      console.error('[TabManager] Failed to restore tabs:', error);
      // Fallback: create default tab
      this.createTab({ url: 'https://nodeseek.com/' });
    }
  }

  /**
   * Persist current tab state to disk
   */
  private saveTabs(): void {
    // Debounce saves to avoid excessive writes
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    this.saveTimer = setTimeout(() => {
      try {
        const state: TabState = {
          tabs: Array.from(this.tabs.values()),
          activeTabId: this.activeTabId
        };
        this.store.set('tabState', state);
      } catch (error) {
        console.error('[TabManager] Failed to save tab state:', error);
      }
    }, 500); // Save after 500ms of inactivity
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    // Final save before disposing
    try {
      const state: TabState = {
        tabs: Array.from(this.tabs.values()),
        activeTabId: this.activeTabId
      };
      this.store.set('tabState', state);
    } catch (error) {
      console.error('[TabManager] Failed to save tab state on dispose:', error);
    }
  }

  createTab(payload: CreateTabPayload = {}): TabSnapshot {
    const id = randomUUID();
    const now = Date.now();
    const tab: TabMetadata = {
      id,
      title: '新標籤頁',
      url: payload.url ?? 'https://nodeseek.com/',
      favicon: undefined,
      isActive: false,
      isSuspended: false,
      isLoading: true,
      createdAt: now,
      updatedAt: now
    };
    this.tabs.set(id, tab);
    this.setActiveTab(id);
    this.saveTabs();
    return this.getSnapshot();
  }

  closeTab(id: string): TabSnapshot {
    if (!this.tabs.has(id)) {
      return this.getSnapshot();
    }

    // 如果关闭的是当前激活的标签页，选择相邻的标签页
    if (this.activeTabId === id) {
      const tabsArray = Array.from(this.tabs.values());
      const closingIndex = tabsArray.findIndex((t) => t.id === id);
      // 优先选择右侧，若无则选左侧
      const nextTab = tabsArray[closingIndex + 1] ?? tabsArray[closingIndex - 1] ?? null;
      this.activeTabId = nextTab?.id ?? null;
      if (nextTab) {
        nextTab.isActive = true;
      }
    }

    this.tabs.delete(id);
    if (!this.tabs.size) {
      this.createTab({});
    }
    this.saveTabs();
    this.emitStateChanged();
    return this.getSnapshot();
  }

  setActiveTab(id: string): TabSnapshot {
    if (!this.tabs.has(id)) {
      return this.getSnapshot();
    }
    if (this.activeTabId) {
      const current = this.tabs.get(this.activeTabId);
      if (current) {
        current.isActive = false;
      }
    }
    this.activeTabId = id;
    const next = this.tabs.get(id)!;
    next.isActive = true;
    next.isSuspended = false;
    next.updatedAt = Date.now();
    this.saveTabs();
    this.emitStateChanged();
    return this.getSnapshot();
  }

  navigateTab(id: string, url: string): TabSnapshot {
    const tab = this.tabs.get(id);
    if (!tab) {
      return this.getSnapshot();
    }
    tab.url = url;
    tab.isLoading = true;
    tab.updatedAt = Date.now();
    this.saveTabs();
    this.emitStateChanged();
    return this.getSnapshot();
  }

  updateTabMeta(payload: UpdateTabMetaPayload): TabSnapshot {
    const tab = this.tabs.get(payload.id);
    if (!tab) {
      return this.getSnapshot();
    }
    Object.assign(tab, {
      title: payload.title ?? tab.title,
      favicon: payload.favicon ?? tab.favicon,
      url: payload.url ?? tab.url,
      isLoading: payload.isLoading ?? tab.isLoading,
      updatedAt: Date.now()
    });
    this.saveTabs();
    this.emitStateChanged();
    return this.getSnapshot();
  }

  markSuspended(id: string): void {
    const tab = this.tabs.get(id);
    if (!tab) {
      return;
    }
    tab.isSuspended = true;
    tab.updatedAt = Date.now();
    this.emitStateChanged();
  }

  resumeTab(id: string): TabSnapshot {
    const tab = this.tabs.get(id);
    if (!tab) {
      return this.getSnapshot();
    }
    tab.isSuspended = false;
    tab.isLoading = true;
    tab.updatedAt = Date.now();
    this.emitStateChanged();
    return this.getSnapshot();
  }

  getSnapshot(): TabSnapshot {
    return {
      tabs: Array.from(this.tabs.values()),
      activeTabId: this.activeTabId
    };
  }

  getTab(id: string): TabMetadata | undefined {
    return this.tabs.get(id);
  }

  private emitStateChanged(): void {
    this.emit('state-changed', this.getSnapshot());
  }

  override on<T extends EventKeys>(event: T, listener: TabManagerEvents[T]): this {
    return super.on(event, listener);
  }

  override once<T extends EventKeys>(event: T, listener: TabManagerEvents[T]): this {
    return super.once(event, listener);
  }
}
