import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { app } from 'electron';
import sqlite3 from 'sqlite3';
import { createClient, WebDAVClient } from 'webdav';
import { ConfigService } from './configService';
import {
  BookmarkInput,
  BookmarkRecord,
  BookmarkSearchPayload,
  BookmarkSyncResult,
  BookmarkUpdatePayload,
  BookmarkFolder,
  BookmarkFolderInput,
  BookmarkFolderUpdatePayload,
  BatchBookmarkOperation
} from '@shared/types/bookmarks';

const DEFAULT_ACCOUNT_ID = 1;
const WEB_DAV_REMOTE_PATH = '/nodeseek/bookmarks.json';
const WEB_DAV_FOLDERS_PATH = '/nodeseek/folders.json';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Manages bookmarks and bookmark folders for the application.
 * Provides CRUD operations, search functionality, and WebDAV synchronization.
 *
 * Features:
 * - Hierarchical folder organization
 * - Full-text search across titles, URLs, and tags
 * - Visit count tracking
 * - Batch operations (delete, move, favorite)
 * - WebDAV cloud sync with conflict resolution
 * - Automatic retry on network failures
 */
export class BookmarkManager {
  private db: sqlite3.Database;
  private webdavClient?: WebDAVClient;
  private syncTimer?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    databaseName = 'nodeseek.db'
  ) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, databaseName);
    this.db = new sqlite3.Database(dbPath);
    this.bootstrapSchema();
    void this.refreshWebDavClient();
  }

  private bootstrapSchema(): void {
    const appPath = app.getAppPath();
    const schemaFile = path.join(appPath, 'database/schema.sql');
    const schema = fs.readFileSync(schemaFile, 'utf-8');
    this.db.serialize(() => {
      this.db.exec(schema);
    });
  }

  dispose(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.db.close();
  }

  /**
   * Adds a new bookmark to the database.
   *
   * @param payload - Bookmark data including title, URL, optional category, tags, and folder
   * @returns The ID of the newly created bookmark
   * @throws Error if validation fails (empty title/URL, invalid URL format, etc.)
   */
  async addBookmark(payload: BookmarkInput): Promise<number> {
    // Validate inputs
    if (!payload.title?.trim()) {
      throw new Error('書籤標題不能為空');
    }

    if (!payload.url?.trim()) {
      throw new Error('書籤網址不能為空');
    }

    try {
      new URL(payload.url);
    } catch {
      throw new Error('無效的網址格式');
    }

    if (payload.title.length > 200) {
      throw new Error('書籤標題過長（最多 200 字符）');
    }

    const stmt = `INSERT INTO bookmarks (account_id, title, url, category, tags, folder_id, is_favorite) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    return this.runWithLastId(stmt, [
      payload.accountId,
      payload.title.trim(),
      payload.url.trim(),
      payload.category?.trim() ?? null,
      payload.tags?.trim() ?? null,
      payload.folderId ?? null,
      payload.isFavorite ? 1 : 0
    ]);
  }

  async listBookmarks(accountId: number = DEFAULT_ACCOUNT_ID): Promise<BookmarkRecord[]> {
    const query = `SELECT * FROM bookmarks WHERE account_id = ? ORDER BY created_at DESC`;
    return this.all<BookmarkRecord>(query, [accountId]);
  }

  async updateBookmark(payload: BookmarkUpdatePayload): Promise<void> {
    // 白名单：仅允许更新以下字段，防止 SQL 注入
    const ALLOWED_FIELDS: Record<string, string> = {
      title: 'title',
      url: 'url',
      category: 'category',
      tags: 'tags',
      folderId: 'folder_id',
      isFavorite: 'is_favorite'
    };

    const fields: string[] = [];
    const values: unknown[] = [];
    Object.entries(payload.data).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      const dbColumn = ALLOWED_FIELDS[key];
      if (!dbColumn) {
        return; // 忽略不在白名单中的字段
      }
      fields.push(`${dbColumn} = ?`);
      values.push(key === 'isFavorite' ? (value ? 1 : 0) : value);
    });

    if (!fields.length) {
      return;
    }

    values.push(payload.id);
    const stmt = `UPDATE bookmarks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await this.run(stmt, values);
  }

  async deleteBookmark(id: number): Promise<void> {
    await this.run(`DELETE FROM bookmarks WHERE id = ?`, [id]);
  }

  async search(payload: BookmarkSearchPayload): Promise<BookmarkRecord[]> {
    const likeKeyword = `%${payload.keyword}%`;
    let stmt = `SELECT * FROM bookmarks WHERE account_id = ? AND (title LIKE ? OR url LIKE ? OR tags LIKE ?)`;
    const params: unknown[] = [payload.accountId, likeKeyword, likeKeyword, likeKeyword];

    if (payload.folderId !== undefined) {
      stmt += ' AND folder_id = ?';
      params.push(payload.folderId);
    }

    if (payload.tags && payload.tags.length > 0) {
      const tagConditions = payload.tags.map(() => 'tags LIKE ?').join(' OR ');
      stmt += ` AND (${tagConditions})`;
      payload.tags.forEach((tag) => params.push(`%${tag}%`));
    }

    stmt += ' ORDER BY updated_at DESC';
    return this.all<BookmarkRecord>(stmt, params);
  }

  async incrementVisitCount(id: number): Promise<void> {
    await this.run(
      `UPDATE bookmarks SET visit_count = visit_count + 1, last_visited = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }

  // Folder management methods
  async createFolder(payload: BookmarkFolderInput): Promise<number> {
    // Validate folder name
    if (!payload.name?.trim()) {
      throw new Error('資料夾名稱不能為空');
    }

    if (payload.name.length > 100) {
      throw new Error('資料夾名稱過長（最多 100 字符）');
    }

    // Check for invalid characters
    if (/[<>:"/\\|?*]/.test(payload.name)) {
      throw new Error('資料夾名稱包含無效字符');
    }

    const stmt = `INSERT INTO bookmark_folders (account_id, name, parent_id, position) VALUES (?, ?, ?, ?)`;
    return this.runWithLastId(stmt, [
      payload.accountId,
      payload.name.trim(),
      payload.parentId ?? null,
      payload.position ?? 0
    ]);
  }

  async listFolders(accountId: number = DEFAULT_ACCOUNT_ID): Promise<BookmarkFolder[]> {
    const query = `SELECT * FROM bookmark_folders WHERE account_id = ? ORDER BY position ASC, name ASC`;
    return this.all<BookmarkFolder>(query, [accountId]);
  }

  async updateFolder(payload: BookmarkFolderUpdatePayload): Promise<void> {
    // 白名单：仅允许更新以下字段，防止 SQL 注入
    const ALLOWED_FIELDS: Record<string, string> = {
      name: 'name',
      parentId: 'parent_id',
      position: 'position'
    };

    const fields: string[] = [];
    const values: unknown[] = [];
    Object.entries(payload.data).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      const dbColumn = ALLOWED_FIELDS[key];
      if (!dbColumn) {
        return; // 忽略不在白名单中的字段
      }
      fields.push(`${dbColumn} = ?`);
      values.push(value);
    });

    if (!fields.length) {
      return;
    }

    values.push(payload.id);
    const stmt = `UPDATE bookmark_folders SET ${fields.join(', ')} WHERE id = ?`;
    await this.run(stmt, values);
  }

  async deleteFolder(id: number, moveToFolder?: number): Promise<void> {
    await this.run('BEGIN TRANSACTION');
    try {
      // Move bookmarks to another folder or root
      if (moveToFolder !== undefined) {
        await this.run(`UPDATE bookmarks SET folder_id = ? WHERE folder_id = ?`, [moveToFolder, id]);
      } else {
        await this.run(`UPDATE bookmarks SET folder_id = NULL WHERE folder_id = ?`, [id]);
      }

      // Move child folders to parent or root
      const folder = await this.get<BookmarkFolder>(`SELECT * FROM bookmark_folders WHERE id = ?`, [id]);
      if (folder) {
        await this.run(`UPDATE bookmark_folders SET parent_id = ? WHERE parent_id = ?`, [
          folder.parentId ?? null,
          id
        ]);
      }

      await this.run(`DELETE FROM bookmark_folders WHERE id = ?`, [id]);
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK').catch(() => {});
      throw error;
    }
  }

  // Batch operations
  async batchOperation(payload: BatchBookmarkOperation): Promise<void> {
    if (payload.ids.length === 0) {
      return;
    }

    const placeholders = payload.ids.map(() => '?').join(',');

    switch (payload.operation) {
      case 'delete':
        await this.run(`DELETE FROM bookmarks WHERE id IN (${placeholders})`, payload.ids);
        break;
      case 'move':
        if (payload.folderId === undefined) {
          throw new Error('folderId is required for move operation');
        }
        await this.run(`UPDATE bookmarks SET folder_id = ? WHERE id IN (${placeholders})`, [
          payload.folderId,
          ...payload.ids
        ]);
        break;
      case 'favorite':
        await this.run(`UPDATE bookmarks SET is_favorite = 1 WHERE id IN (${placeholders})`, payload.ids);
        break;
      case 'unfavorite':
        await this.run(`UPDATE bookmarks SET is_favorite = 0 WHERE id IN (${placeholders})`, payload.ids);
        break;
    }
  }

  async triggerManualSync(): Promise<BookmarkSyncResult | null> {
    if (!this.webdavClient) {
      return null;
    }
    return this.syncToWebDav();
  }

  async refreshWebDavClient(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
    this.webdavClient = this.createWebDavClient();
    if (!this.webdavClient) {
      return;
    }

    try {
      await this.syncFromWebDav();
    } catch (error) {
      console.warn('[bookmark] 無法從 WebDAV 讀取遠端資料', error);
    }

    const interval = this.configService.getConfig().webdav.syncInterval;
    if (interval > 0) {
      this.syncTimer = setInterval(() => {
        this.syncToWebDav().catch((error) => console.warn('[bookmark] WebDAV 自動同步失敗', error));
      }, interval);
    }
  }

  private createWebDavClient(): WebDAVClient | undefined {
    const { url, username, password } = this.configService.getConfig().webdav;
    if (!url || !username || !password) {
      return undefined;
    }
    return createClient(url, { username, password });
  }

  private async syncToWebDav(): Promise<BookmarkSyncResult> {
    if (!this.webdavClient) {
      throw new Error('尚未設定 WebDAV，同步已跳過');
    }

    // Check for conflicts before uploading
    const localHash = await this.getLocalSyncHash();
    const remoteHash = await this.getRemoteSyncHash();

    if (remoteHash && localHash && remoteHash !== localHash) {
      // Conflict detected - merge strategy
      const remoteData = await this.fetchRemoteData();
      if (remoteData) {
        await this.mergeBookmarks(remoteData.bookmarks, remoteData.folders);
      }
    }

    const bookmarks = await this.listAll();
    const folders = await this.listFolders();
    const payload = JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      bookmarks,
      folders
    });

    await this.retryOperation(async () => {
      await this.webdavClient!.putFileContents(WEB_DAV_REMOTE_PATH, payload, { overwrite: true });
    });

    return this.upsertSyncStatus(payload, 'local');
  }

  private async syncFromWebDav(): Promise<BookmarkSyncResult | null> {
    if (!this.webdavClient) {
      return null;
    }
    try {
      const remoteData = await this.fetchRemoteData();
      if (!remoteData) {
        return null;
      }

      const localHash = await this.getLocalSyncHash();
      const remoteHash = createHash('sha1').update(JSON.stringify(remoteData)).digest('hex');

      if (localHash === remoteHash) {
        // No changes, skip sync
        return {
          lastSync: new Date().toISOString(),
          syncHash: localHash,
          source: 'remote'
        };
      }

      await this.mergeBookmarks(remoteData.bookmarks, remoteData.folders);
      return this.upsertSyncStatus(JSON.stringify(remoteData), 'remote');
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async fetchRemoteData(): Promise<{
    bookmarks: BookmarkRecord[];
    folders: BookmarkFolder[];
  } | null> {
    if (!this.webdavClient) {
      return null;
    }

    const remoteContent = await this.retryOperation(async () => {
      return (await this.webdavClient!.getFileContents(WEB_DAV_REMOTE_PATH, { format: 'text' })) as string;
    });

    if (!remoteContent) {
      return null;
    }

    const parsed = JSON.parse(remoteContent) as {
      version?: number;
      bookmarks?: BookmarkRecord[];
      folders?: BookmarkFolder[];
    };

    return {
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      folders: Array.isArray(parsed.folders) ? parsed.folders : []
    };
  }

  private async mergeBookmarks(
    remoteBookmarks: BookmarkRecord[],
    remoteFolders: BookmarkFolder[]
  ): Promise<void> {
    await this.run('BEGIN TRANSACTION');
    try {
      // Merge folders first
      const localFolders = await this.listFolders();
      const localFolderMap = new Map(localFolders.map((f) => [f.id, f]));

      for (const remoteFolder of remoteFolders) {
        const localFolder = localFolderMap.get(remoteFolder.id);
        if (!localFolder) {
          // Insert new folder
          await this.run(
            `INSERT OR IGNORE INTO bookmark_folders (id, account_id, name, parent_id, position, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              remoteFolder.id,
              remoteFolder.accountId,
              remoteFolder.name,
              remoteFolder.parentId,
              remoteFolder.position,
              remoteFolder.created_at
            ]
          );
        } else {
          // Update if remote is newer
          const localDate = new Date(localFolder.created_at);
          const remoteDate = new Date(remoteFolder.created_at);
          if (remoteDate > localDate) {
            await this.run(`UPDATE bookmark_folders SET name = ?, parent_id = ?, position = ? WHERE id = ?`, [
              remoteFolder.name,
              remoteFolder.parentId,
              remoteFolder.position,
              remoteFolder.id
            ]);
          }
        }
      }

      // Merge bookmarks
      const localBookmarks = await this.listAll();
      const localBookmarkMap = new Map(localBookmarks.map((b) => [b.id, b]));

      for (const remoteBookmark of remoteBookmarks) {
        const localBookmark = localBookmarkMap.get(remoteBookmark.id);
        if (!localBookmark) {
          // Insert new bookmark
          await this.run(
            `INSERT OR IGNORE INTO bookmarks (id, account_id, title, url, category, tags, folder_id, is_favorite, visit_count, last_visited, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              remoteBookmark.id,
              remoteBookmark.accountId,
              remoteBookmark.title,
              remoteBookmark.url,
              remoteBookmark.category,
              remoteBookmark.tags,
              remoteBookmark.folderId,
              remoteBookmark.isFavorite ? 1 : 0,
              remoteBookmark.visitCount,
              remoteBookmark.lastVisited,
              remoteBookmark.created_at,
              remoteBookmark.updated_at
            ]
          );
        } else {
          // Merge: prefer remote if it's newer, but keep local visit_count
          const localDate = new Date(localBookmark.updated_at);
          const remoteDate = new Date(remoteBookmark.updated_at);
          if (remoteDate > localDate) {
            await this.run(
              `UPDATE bookmarks SET title = ?, url = ?, category = ?, tags = ?, folder_id = ?, is_favorite = ?, updated_at = ? WHERE id = ?`,
              [
                remoteBookmark.title,
                remoteBookmark.url,
                remoteBookmark.category,
                remoteBookmark.tags,
                remoteBookmark.folderId,
                remoteBookmark.isFavorite ? 1 : 0,
                remoteBookmark.updated_at,
                remoteBookmark.id
              ]
            );
          }
        }
      }

      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK').catch(() => {});
      throw error;
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[bookmark] Retry attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} failed:`, error);

        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }

    throw lastError;
  }

  private async getLocalSyncHash(): Promise<string | null> {
    const status = await this.get<{ sync_hash: string }>(`SELECT sync_hash FROM sync_status WHERE id = 1`);
    return status?.sync_hash ?? null;
  }

  private async getRemoteSyncHash(): Promise<string | null> {
    if (!this.webdavClient) {
      return null;
    }

    try {
      const remoteContent = await this.retryOperation(async () => {
        return (await this.webdavClient!.getFileContents(WEB_DAV_REMOTE_PATH, { format: 'text' })) as string;
      });

      if (!remoteContent) {
        return null;
      }

      return createHash('sha1').update(remoteContent).digest('hex');
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      console.warn('[bookmark] Failed to get remote hash:', error);
      return null;
    }
  }

  private async listAll(): Promise<BookmarkRecord[]> {
    return this.all<BookmarkRecord>(`SELECT * FROM bookmarks ORDER BY created_at DESC`);
  }

  private async upsertSyncStatus(payload: string, source: 'local' | 'remote'): Promise<BookmarkSyncResult> {
    const hash = createHash('sha1').update(payload).digest('hex');
    await this.run(
      `INSERT INTO sync_status (id, account_id, last_sync, sync_hash) VALUES (1, NULL, CURRENT_TIMESTAMP, ?)
       ON CONFLICT(id) DO UPDATE SET last_sync = CURRENT_TIMESTAMP, sync_hash = excluded.sync_hash`,
      [hash]
    );
    return {
      lastSync: new Date().toISOString(),
      syncHash: hash,
      source
    };
  }

  private run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private runWithLastId(sql: string, params: unknown[] = []): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (this: sqlite3.RunResult, error) {
        if (error) {
          reject(error);
          return;
        }
        resolve(this.lastID);
      });
    });
  }

  private all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (error, rows) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(rows as T[]);
      });
    });
  }

  private get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (error, row) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(row as T | undefined);
      });
    });
  }
}
