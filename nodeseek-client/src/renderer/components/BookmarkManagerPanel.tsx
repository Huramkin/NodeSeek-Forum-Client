import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { BookmarkRecord, BookmarkSyncResult, BookmarkFolder } from '@shared/types/bookmarks';

const Overlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(5, 6, 7, 0.78);
  backdrop-filter: blur(8px);
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 20;
`;

const Panel = styled.div`
  width: 1100px;
  max-width: 95%;
  height: 85%;
  background: #10131b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: row;
  padding: 0;
  gap: 0;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  overflow: hidden;
`;

const Sidebar = styled.div`
  width: 240px;
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 8px;
  overflow-y: auto;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 16px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Heading = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #f8fafc;
`;

const CloseButton = styled.button`
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.16);
  }
`;

const SearchBar = styled.div`
  display: flex;
  gap: 8px;
`;

const Input = styled.input`
  flex: 1;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #e2e8f0;
  padding: 8px 12px;
  font-size: 14px;
`;

const PrimaryButton = styled.button<{ $variant?: 'ghost' | 'primary' }>`
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 14px;
  cursor: pointer;
  background: ${({ $variant }) => ($variant === 'ghost' ? 'transparent' : 'rgba(79, 130, 255, 0.85)')};
  color: ${({ $variant }) => ($variant === 'ghost' ? '#cbd5f5' : '#ffffff')};
  border: ${({ $variant }) => ($variant === 'ghost' ? '1px solid rgba(255, 255, 255, 0.24)' : 'none')};

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'ghost' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(79, 130, 255, 1)'};
  }
`;

const ListContainer = styled.div`
  flex: 1;
  overflow: auto;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const BookmarkCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BookmarkTitle = styled.div`
  font-size: 15px;
  color: #f1f5f9;
  font-weight: 600;
`;

const BookmarkMeta = styled.div`
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 6px;
`;

const Form = styled.form`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
`;

const FullWidth = styled.div`
  grid-column: span 2;
`;

const EmptyState = styled.div`
  color: #94a3b8;
  text-align: center;
  padding: 40px 0;
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #94a3b8;
`;

const FolderItem = styled.div<{ $active?: boolean; $indent?: number }>`
  padding: 8px 12px;
  padding-left: ${({ $indent }) => 12 + ($indent ?? 0) * 16}px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: ${({ $active }) => ($active ? '#ffffff' : '#cbd5e1')};
  background: ${({ $active }) => ($active ? 'rgba(79, 130, 255, 0.3)' : 'transparent')};
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${({ $active }) => ($active ? 'rgba(79, 130, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)')};
  }
`;

const FolderIcon = styled.span`
  font-size: 16px;
  min-width: 16px;
`;

const BatchToolbar = styled.div`
  display: flex;
  gap: 8px;
  padding: 12px;
  background: rgba(79, 130, 255, 0.1);
  border-radius: 8px;
  align-items: center;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const SmallButton = styled.button`
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  background: rgba(79, 130, 255, 0.6);
  color: #ffffff;

  &:hover {
    background: rgba(79, 130, 255, 0.8);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const SectionTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DEFAULT_ACCOUNT_ID = 1;
const EMPTY_FORM = {
  id: undefined as number | undefined,
  title: '',
  url: '',
  category: '',
  tags: '',
  folderId: undefined as number | undefined,
  isFavorite: false
};

export const BookmarkManagerPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [syncStatus, setSyncStatus] = useState<BookmarkSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [selectedBookmarks, setSelectedBookmarks] = useState<Set<number>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const list = await window.electronAPI.bookmarks.list(DEFAULT_ACCOUNT_ID);
      setBookmarks(list);
      setError(null);
    } catch (err) {
      setError('無法載入書籤，請稍後再試');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      const list = await window.electronAPI.folders.list(DEFAULT_ACCOUNT_ID);
      setFolders(list);
    } catch (err) {
      console.error('無法載入資料夾', err);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadBookmarks();
      void loadFolders();
      setSelectedBookmarks(new Set());
    }
  }, [open, loadBookmarks, loadFolders]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    // Validate title
    if (!form.title.trim()) {
      setError('標題為必填');
      return;
    }

    if (form.title.length > 200) {
      setError('標題長度不能超過 200 個字符');
      return;
    }

    // Validate URL
    if (!form.url.trim()) {
      setError('網址為必填');
      return;
    }

    try {
      new URL(form.url);
    } catch {
      setError('請輸入有效的網址格式');
      return;
    }
    try {
      setError(null);
      if (form.id) {
        await window.electronAPI.bookmarks.update({
          id: form.id,
          data: {
            title: form.title,
            url: form.url,
            category: form.category || undefined,
            tags: form.tags || undefined,
            folderId: form.folderId,
            isFavorite: form.isFavorite
          }
        });
      } else {
        await window.electronAPI.bookmarks.add({
          accountId: DEFAULT_ACCOUNT_ID,
          title: form.title,
          url: form.url,
          category: form.category || undefined,
          tags: form.tags || undefined,
          folderId: form.folderId ?? selectedFolder ?? undefined,
          isFavorite: form.isFavorite
        });
      }
      setForm({ ...EMPTY_FORM });
      void loadBookmarks();
    } catch (err) {
      setError('儲存失敗，請再試一次');
      console.error(err);
    }
  };

  const handleEdit = (record: BookmarkRecord) => {
    setForm({
      id: record.id,
      title: record.title,
      url: record.url,
      category: record.category ?? '',
      tags: record.tags ?? '',
      folderId: record.folderId,
      isFavorite: record.isFavorite ?? false
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await window.electronAPI.bookmarks.remove(id);
      void loadBookmarks();
    } catch (err) {
      setError('刪除失敗');
      console.error(err);
    }
  };

  const handleSearch = async () => {
    if (!keyword.trim()) {
      void loadBookmarks();
      return;
    }
    try {
      const results = await window.electronAPI.bookmarks.search({
        accountId: DEFAULT_ACCOUNT_ID,
        keyword
      });
      setBookmarks(results);
    } catch (err) {
      setError('搜尋失敗');
      console.error(err);
    }
  };

  const handleSync = async () => {
    try {
      const result = await window.electronAPI.bookmarks.sync();
      setSyncStatus(result);
      await loadBookmarks();
      await loadFolders();
    } catch (err) {
      setError('同步失敗，請檢查 WebDAV 設定');
      console.error(err);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('請輸入資料夾名稱：');
    if (!name?.trim()) return;

    try {
      await window.electronAPI.folders.create({
        accountId: DEFAULT_ACCOUNT_ID,
        name: name.trim(),
        parentId: selectedFolder ?? undefined
      });
      await loadFolders();
    } catch (err) {
      setError('建立資料夾失敗');
      console.error(err);
    }
  };

  const handleToggleBookmark = (id: number) => {
    setSelectedBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedBookmarks.size === 0) return;
    if (!confirm(`確定要刪除 ${selectedBookmarks.size} 個書籤嗎？`)) return;

    try {
      await window.electronAPI.bookmarks.batch({
        ids: Array.from(selectedBookmarks),
        operation: 'delete'
      });
      setSelectedBookmarks(new Set());
      await loadBookmarks();
    } catch (err) {
      setError('批次刪除失敗');
      console.error(err);
    }
  };

  const handleBatchMove = async () => {
    if (selectedBookmarks.size === 0) return;

    const targetFolderId = prompt('請輸入目標資料夾 ID（留空表示移至根目錄）：');
    if (targetFolderId === null) return;

    try {
      await window.electronAPI.bookmarks.batch({
        ids: Array.from(selectedBookmarks),
        operation: 'move',
        folderId: targetFolderId ? parseInt(targetFolderId) : undefined
      });
      setSelectedBookmarks(new Set());
      await loadBookmarks();
    } catch (err) {
      setError('批次移動失敗');
      console.error(err);
    }
  };

  const handleBatchFavorite = async (favorite: boolean) => {
    if (selectedBookmarks.size === 0) return;

    try {
      await window.electronAPI.bookmarks.batch({
        ids: Array.from(selectedBookmarks),
        operation: favorite ? 'favorite' : 'unfavorite'
      });
      setSelectedBookmarks(new Set());
      await loadBookmarks();
    } catch (err) {
      setError('批次操作失敗');
      console.error(err);
    }
  };

  const filteredBookmarks = useMemo(() => {
    let result = bookmarks;

    if (showFavorites) {
      result = result.filter((b) => b.isFavorite);
    } else if (selectedFolder !== null) {
      result = result.filter((b) => b.folderId === selectedFolder);
    }

    return result;
  }, [bookmarks, selectedFolder, showFavorites]);

  const helperText = useMemo(() => {
    if (error) {
      return error;
    }
    if (syncStatus) {
      return `最後同步：${new Date(syncStatus.lastSync).toLocaleString()}（來源：${syncStatus.source === 'local' ? '本地' : '遠端'}）`;
    }
    return '書籤儲存在本地 SQLite，可透過 WebDAV 同步';
  }, [error, syncStatus]);

  const buildFolderTree = useCallback(
    (parentId: number | null = null, indent = 0): JSX.Element[] => {
      return folders
        .filter((f) => f.parentId === parentId)
        .map((folder) => (
          <div key={folder.id}>
            <FolderItem
              $active={selectedFolder === folder.id}
              $indent={indent}
              onClick={() => {
                setSelectedFolder(folder.id);
                setShowFavorites(false);
              }}
            >
              <FolderIcon>📁</FolderIcon>
              {folder.name}
            </FolderItem>
            {buildFolderTree(folder.id, indent + 1)}
          </div>
        ));
    },
    [folders, selectedFolder]
  );

  return (
    <Overlay $open={open}>
      <Panel>
        <Sidebar>
          <SectionTitle>檢視</SectionTitle>
          <FolderItem
            $active={!showFavorites && selectedFolder === null}
            onClick={() => {
              setSelectedFolder(null);
              setShowFavorites(false);
            }}
          >
            <FolderIcon>📚</FolderIcon>
            所有書籤
          </FolderItem>
          <FolderItem
            $active={showFavorites}
            onClick={() => {
              setShowFavorites(true);
              setSelectedFolder(null);
            }}
          >
            <FolderIcon>⭐</FolderIcon>
            我的最愛
          </FolderItem>

          <SectionTitle style={{ marginTop: '16px' }}>資料夾</SectionTitle>
          {buildFolderTree()}
          <PrimaryButton type="button" onClick={handleCreateFolder} style={{ marginTop: '8px' }}>
            + 新增資料夾
          </PrimaryButton>
        </Sidebar>

        <MainContent>
          <Header>
            <Heading>書籤管理</Heading>
            <CloseButton onClick={onClose}>×</CloseButton>
          </Header>

          <SearchBar>
            <Input
              placeholder="輸入關鍵字快速搜尋"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
            />
            <PrimaryButton type="button" onClick={handleSearch}>
              搜尋
            </PrimaryButton>
            <PrimaryButton type="button" onClick={handleSync} $variant="ghost">
              同步 WebDAV
            </PrimaryButton>
          </SearchBar>

          {selectedBookmarks.size > 0 && (
            <BatchToolbar>
              <span style={{ color: '#cbd5e1' }}>已選擇 {selectedBookmarks.size} 項</span>
              <SmallButton onClick={handleBatchDelete}>刪除</SmallButton>
              <SmallButton onClick={handleBatchMove}>移動</SmallButton>
              <SmallButton onClick={() => handleBatchFavorite(true)}>加入最愛</SmallButton>
              <SmallButton onClick={() => handleBatchFavorite(false)}>取消最愛</SmallButton>
              <SmallButton onClick={() => setSelectedBookmarks(new Set())}>取消選擇</SmallButton>
            </BatchToolbar>
          )}

          <ListContainer>
            {loading ? (
              <EmptyState>載入書籤中...</EmptyState>
            ) : filteredBookmarks.length ? (
              filteredBookmarks.map((bookmark) => (
                <BookmarkCard key={bookmark.id}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                    <Checkbox
                      type="checkbox"
                      checked={selectedBookmarks.has(bookmark.id)}
                      onChange={() => handleToggleBookmark(bookmark.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <BookmarkTitle>
                        {bookmark.isFavorite && '⭐ '}
                        {bookmark.title}
                      </BookmarkTitle>
                      <BookmarkMeta>
                        <span>{bookmark.url}</span>
                        {bookmark.category && <span>分類：{bookmark.category}</span>}
                        {bookmark.tags && <span>標籤：{bookmark.tags}</span>}
                        {bookmark.visitCount > 0 && <span>訪問：{bookmark.visitCount} 次</span>}
                      </BookmarkMeta>
                      <ActionRow>
                        <PrimaryButton type="button" onClick={() => handleEdit(bookmark)}>
                          編輯
                        </PrimaryButton>
                        <PrimaryButton
                          type="button"
                          $variant="ghost"
                          onClick={() => handleDelete(bookmark.id)}
                        >
                          刪除
                        </PrimaryButton>
                      </ActionRow>
                    </div>
                  </div>
                </BookmarkCard>
              ))
            ) : (
              <EmptyState>尚未新增任何書籤</EmptyState>
            )}
          </ListContainer>

          <Form onSubmit={handleSubmit}>
            <Input
              placeholder="標題"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <Input
              placeholder="分類（選填）"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            />
            <FullWidth>
              <Input
                placeholder="網址"
                value={form.url}
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
              />
            </FullWidth>
            <Input
              placeholder="標籤（以逗號分隔）"
              value={form.tags}
              onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Checkbox
                type="checkbox"
                checked={form.isFavorite}
                onChange={(e) => setForm((prev) => ({ ...prev, isFavorite: e.target.checked }))}
              />
              <span style={{ color: '#cbd5e1', fontSize: '14px' }}>加入最愛</span>
            </div>
            <PrimaryButton type="submit">{form.id ? '更新書籤' : '新增書籤'}</PrimaryButton>
          </Form>

          <Footer>{helperText}</Footer>
        </MainContent>
      </Panel>
    </Overlay>
  );
};
