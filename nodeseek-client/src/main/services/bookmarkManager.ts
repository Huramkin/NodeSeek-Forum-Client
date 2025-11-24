import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import sqlite3 from 'sqlite3';

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

export class BookmarkManager {
  private db: sqlite3.Database;

  constructor(databaseName = 'nodeseek.db') {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, databaseName);
    this.db = new sqlite3.Database(dbPath);
    this.bootstrapSchema();
  }

  private bootstrapSchema(): void {
    const appPath = app.getAppPath();
    const schemaFile = path.join(appPath, 'database/schema.sql');
    const schema = fs.readFileSync(schemaFile, 'utf-8');
    this.db.serialize(() => {
      this.db.exec(schema);
    });
  }

  addBookmark(payload: BookmarkInput): Promise<number> {
    return new Promise((resolve, reject) => {
      const stmt = `INSERT INTO bookmarks (account_id, title, url, category, tags) VALUES (?, ?, ?, ?, ?)`;
      this.db.run(stmt, [payload.accountId, payload.title, payload.url, payload.category ?? null, payload.tags ?? null], function (this: sqlite3.RunResult, error) {
        if (error) {
          reject(error);
          return;
        }
        resolve(this.lastID);
      });
    });
  }

  listBookmarks(accountId: number): Promise<BookmarkRecord[]> {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT * FROM bookmarks WHERE account_id = ? ORDER BY created_at DESC`, [accountId], (error, rows) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(rows as BookmarkRecord[]);
      });
    });
  }

  updateBookmark(id: number, data: Partial<BookmarkInput>): Promise<void> {
    return new Promise((resolve, reject) => {
      const fields: string[] = [];
      const values: any[] = [];
      Object.entries(data).forEach(([key, value]) => {
        fields.push(`${key} = ?`);
        values.push(value);
      });
      values.push(id);
      const stmt = `UPDATE bookmarks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      this.db.run(stmt, values, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  deleteBookmark(id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM bookmarks WHERE id = ?`, [id], (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  search(accountId: number, keyword: string): Promise<BookmarkRecord[]> {
    return new Promise((resolve, reject) => {
      const likeKeyword = `%${keyword}%`;
      this.db.all(
        `SELECT * FROM bookmarks WHERE account_id = ? AND (title LIKE ? OR url LIKE ? OR tags LIKE ?) ORDER BY updated_at DESC`,
        [accountId, likeKeyword, likeKeyword, likeKeyword],
        (error, rows) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(rows as BookmarkRecord[]);
        }
      );
    });
  }
}
