export interface TabMetadata {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isActive: boolean;
  isSuspended: boolean;
  isLoading: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TabSnapshot {
  tabs: TabMetadata[];
  activeTabId: string | null;
}

export interface CreateTabPayload {
  url?: string;
  openerId?: string;
}

export interface NavigateTabPayload {
  id: string;
  url: string;
}

export interface UpdateTabMetaPayload {
  id: string;
  title?: string;
  favicon?: string;
  url?: string;
  isLoading?: boolean;
}

export interface ReloadTabPayload {
  id: string;
  mode?: 'soft' | 'hard';
  reason?: 'user' | 'resource-monitor' | 'resume';
  url?: string;
}
