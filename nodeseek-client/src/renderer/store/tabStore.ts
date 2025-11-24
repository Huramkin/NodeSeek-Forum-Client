import { create } from 'zustand';
import { TabMetadata, TabSnapshot } from '@shared/types/tabs';

interface TabState {
  tabs: TabMetadata[];
  activeTabId: string | null;
  loading: boolean;
  setSnapshot: (snapshot: TabSnapshot) => void;
}

export const useTabStore = create<TabState>((set) => ({
  tabs: [],
  activeTabId: null,
  loading: true,
  setSnapshot: (snapshot) =>
    set({
      tabs: snapshot.tabs,
      activeTabId: snapshot.activeTabId,
      loading: false
    })
}));
