import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { app } from 'electron';
import sqlite3 from 'sqlite3';
import { createClient, WebDAVClient } from 'webdav';
import { ConfigService } from './configService';
import { BookmarkInput, BookmarkRecord, BookmarkSearchPayload, BookmarkSyncResult, BookmarkUpdatePayload } from '@shared/types/bookmarks';

const DEFAULT_ACCOUNT_ID = 1;
const WEB_DAV_REMOTE_PATH = '/nodeseek/bookmarks.json';

export class BookmarkManager {
  private db: sqlite3.Database;
  private webdavClient?: WebDAVClient;
  private syncTimer?: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService, databaseName = 'nodeseek.db') {
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

  async addBookmark(payload: BookmarkInput): Promise<number> {
    const stmt = `INSERT INTO bookmarks (account_id, title, url, category, tags) VALUES (?, ?, ?, ?, ?)`;
    return this.runWithLastId(stmt, [payload.accountId, payload.title, payload.url, payload.category ?? null, payload.tags ?? null]);
  }

  async listBookmarks(accountId: number = DEFAULT_ACCOUNT_ID): Promise<BookmarkRecord[]> {
    const query = `SELECT * FROM bookmarks WHERE account_id = ? ORDER BY created_at DESC`;
    return this.all<BookmarkRecord>(query, [accountId]);
  }

  async updateBookmark(payload: BookmarkUpdatePayload): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    Object.entries(payload.data).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      fields.push(`${key} = ?`);
      values.push(value);
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
    const stmt = `SELECT * FROM bookmarks WHERE account_id = ? AND (title LIKE ? OR url LIKE ? OR tags LIKE ?) ORDER BY updated_at DESC`;
    return this.all<BookmarkRecord>(stmt, [payload.accountId, likeKeyword, likeKeyword, likeKeyword]);
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
    const bookmarks = await this.listAll();
    const payload = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      bookmarks
    });
    await this.webdavClient.putFileContents(WEB_DAV_REMOTE_PATH, payload, { overwrite: true });
    return this.upsertSyncStatus(payload, 'local');
  }

  private async syncFromWebDav(): Promise<BookmarkSyncResult | null> {
    if (!this.webdavClient) {
      return null;
    }
    try {
      const remoteContent = (await this.webdavClient.getFileContents(WEB_DAV_REMOTE_PATH, { format: 'text' })) as string;
      if (!remoteContent) {
        return null;
      }
      const parsed = JSON.parse(remoteContent) as { bookmarks?: BookmarkRecord[] };
      if (Array.isArray(parsed.bookmarks)) {
        await this.replaceAllBookmarks(parsed.bookmarks);
      }
      return this.upsertSyncStatus(remoteContent, 'remote');
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  private async listAll(): Promise<BookmarkRecord[]> {
    return this.all<BookmarkRecord>(`SELECT * FROM bookmarks ORDER BY created_at DESC`);
  }

  private async replaceAllBookmarks(records: BookmarkRecord[]): Promise<void> {
    await this.run('BEGIN TRANSACTION');
    try {
      await this.run('DELETE FROM bookmarks');
      for (const record of records) {
        await this.run(
          `INSERT INTO bookmarks (id, account_id, title, url, category, tags, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [record.id, record.accountId, record.title, record.url, record.category ?? null, record.tags ?? null, record.created_at, record.updated_at]
        );
      }
      await this.run('COMMIT');
    } catch (error) {
      await this.run('ROLLBACK').catch(() => {});
      throw error;
    }
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
}
