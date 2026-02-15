export interface BookmarkInput {
  accountId: number;
  title: string;
  url: string;
  category?: string;
  tags?: string;
  folderId?: number;
  isFavorite?: boolean;
}

export interface BookmarkRecord extends BookmarkInput {
  id: number;
  visitCount: number;
  lastVisited: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookmarkUpdatePayload {
  id: number;
  data: Partial<Omit<BookmarkInput, 'accountId'>>;
}

export interface BookmarkSearchPayload {
  accountId: number;
  keyword: string;
  folderId?: number;
  tags?: string[];
}

export interface BookmarkSyncResult {
  lastSync: string;
  syncHash: string;
  source: 'local' | 'remote';
}

export interface BookmarkFolder {
  id: number;
  accountId: number;
  name: string;
  parentId: number | null;
  position: number;
  created_at: string;
}

export interface BookmarkFolderInput {
  accountId: number;
  name: string;
  parentId?: number;
  position?: number;
}

export interface BookmarkFolderUpdatePayload {
  id: number;
  data: Partial<Omit<BookmarkFolderInput, 'accountId'>>;
}

export interface BatchBookmarkOperation {
  ids: number[];
  operation: 'delete' | 'move' | 'favorite' | 'unfavorite';
  folderId?: number;
}
