import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { BookmarkManager } from '../bookmarkManager';
import { ConfigService } from '../configService';

describe('BookmarkManager', () => {
  let bookmarkManager: BookmarkManager;
  let configService: ConfigService;
  let testDbPath: string;

  beforeEach(() => {
    // Use a temporary database for testing
    testDbPath = path.join(os.tmpdir(), `test-${Date.now()}.db`);
    configService = new ConfigService();
    bookmarkManager = new BookmarkManager(configService, testDbPath);
  });

  afterEach(() => {
    bookmarkManager.dispose();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('addBookmark', () => {
    it('should add a bookmark successfully', async () => {
      const id = await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'Test Bookmark',
        url: 'https://example.com',
        category: 'Test',
        tags: 'test,example'
      });

      expect(id).toBeGreaterThan(0);
    });

    it('should add a bookmark with folder', async () => {
      const folderId = await bookmarkManager.createFolder({
        accountId: 1,
        name: 'Test Folder'
      });

      const id = await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'Test Bookmark',
        url: 'https://example.com',
        folderId
      });

      expect(id).toBeGreaterThan(0);
    });
  });

  describe('listBookmarks', () => {
    it('should return empty array initially', async () => {
      const bookmarks = await bookmarkManager.listBookmarks(1);
      expect(bookmarks).toEqual([]);
    });

    it('should return all bookmarks for an account', async () => {
      await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'Bookmark 1',
        url: 'https://example1.com'
      });

      await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'Bookmark 2',
        url: 'https://example2.com'
      });

      const bookmarks = await bookmarkManager.listBookmarks(1);
      expect(bookmarks).toHaveLength(2);
    });
  });

  describe('updateBookmark', () => {
    it('should update bookmark title', async () => {
      const id = await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'Original Title',
        url: 'https://example.com'
      });

      await bookmarkManager.updateBookmark({
        id,
        data: { title: 'Updated Title' }
      });

      const bookmarks = await bookmarkManager.listBookmarks(1);
      expect(bookmarks[0].title).toBe('Updated Title');
    });
  });

  describe('deleteBookmark', () => {
    it('should delete a bookmark', async () => {
      const id = await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'To Delete',
        url: 'https://example.com'
      });

      await bookmarkManager.deleteBookmark(id);

      const bookmarks = await bookmarkManager.listBookmarks(1);
      expect(bookmarks).toHaveLength(0);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'React Tutorial',
        url: 'https://react.dev',
        tags: 'react,frontend'
      });

      await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'Vue.js Guide',
        url: 'https://vuejs.org',
        tags: 'vue,frontend'
      });

      await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'Node.js Docs',
        url: 'https://nodejs.org',
        tags: 'nodejs,backend'
      });
    });

    it('should search by title', async () => {
      const results = await bookmarkManager.search({
        accountId: 1,
        keyword: 'React'
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('React Tutorial');
    });

    it('should search by URL', async () => {
      const results = await bookmarkManager.search({
        accountId: 1,
        keyword: 'vuejs'
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Vue.js Guide');
    });

    it('should search by tags', async () => {
      const results = await bookmarkManager.search({
        accountId: 1,
        keyword: 'frontend'
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('folder management', () => {
    it('should create a folder', async () => {
      const id = await bookmarkManager.createFolder({
        accountId: 1,
        name: 'Development'
      });

      expect(id).toBeGreaterThan(0);
    });

    it('should list folders', async () => {
      await bookmarkManager.createFolder({
        accountId: 1,
        name: 'Folder 1'
      });

      await bookmarkManager.createFolder({
        accountId: 1,
        name: 'Folder 2'
      });

      const folders = await bookmarkManager.listFolders(1);
      expect(folders).toHaveLength(2);
    });

    it('should update folder', async () => {
      const id = await bookmarkManager.createFolder({
        accountId: 1,
        name: 'Old Name'
      });

      await bookmarkManager.updateFolder({
        id,
        data: { name: 'New Name' }
      });

      const folders = await bookmarkManager.listFolders(1);
      expect(folders[0].name).toBe('New Name');
    });

    it('should delete folder and move bookmarks', async () => {
      const folderId = await bookmarkManager.createFolder({
        accountId: 1,
        name: 'To Delete'
      });

      await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'Test',
        url: 'https://example.com',
        folderId
      });

      await bookmarkManager.deleteFolder(folderId);

      const folders = await bookmarkManager.listFolders(1);
      expect(folders).toHaveLength(0);

      const bookmarks = await bookmarkManager.listBookmarks(1);
      expect(bookmarks[0].folderId).toBeUndefined();
    });
  });

  describe('batch operations', () => {
    let bookmarkIds: number[];

    beforeEach(async () => {
      bookmarkIds = [];
      for (let i = 1; i <= 3; i++) {
        const id = await bookmarkManager.addBookmark({
          accountId: 1,
          title: `Bookmark ${i}`,
          url: `https://example${i}.com`
        });
        bookmarkIds.push(id);
      }
    });

    it('should batch delete bookmarks', async () => {
      await bookmarkManager.batchOperation({
        ids: bookmarkIds,
        operation: 'delete'
      });

      const bookmarks = await bookmarkManager.listBookmarks(1);
      expect(bookmarks).toHaveLength(0);
    });

    it('should batch move bookmarks', async () => {
      const folderId = await bookmarkManager.createFolder({
        accountId: 1,
        name: 'Target Folder'
      });

      await bookmarkManager.batchOperation({
        ids: bookmarkIds,
        operation: 'move',
        folderId
      });

      const bookmarks = await bookmarkManager.listBookmarks(1);
      bookmarks.forEach((bookmark) => {
        expect(bookmark.folderId).toBe(folderId);
      });
    });

    it('should batch favorite bookmarks', async () => {
      await bookmarkManager.batchOperation({
        ids: bookmarkIds,
        operation: 'favorite'
      });

      const bookmarks = await bookmarkManager.listBookmarks(1);
      bookmarks.forEach((bookmark) => {
        expect(bookmark.isFavorite).toBe(true);
      });
    });
  });

  describe('visit count', () => {
    it('should increment visit count', async () => {
      const id = await bookmarkManager.addBookmark({
        accountId: 1,
        title: 'Test',
        url: 'https://example.com'
      });

      await bookmarkManager.incrementVisitCount(id);
      await bookmarkManager.incrementVisitCount(id);

      const bookmarks = await bookmarkManager.listBookmarks(1);
      expect(bookmarks[0].visitCount).toBe(2);
    });
  });
});
