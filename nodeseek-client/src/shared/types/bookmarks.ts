export interface BookmarkInput {
  accountId: number;
  title: string;
  url: string;
  category?: string;
  tags?: string;
}

export interface BookmarkRecord extends BookmarkInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface BookmarkUpdatePayload {
  id: number;
  data: Partial<BookmarkInput>;
}

export interface BookmarkSearchPayload {
  accountId: number;
  keyword: string;
}

export interface BookmarkSyncResult {
  lastSync: string;
  syncHash: string;
  source: 'local' | 'remote';
}
