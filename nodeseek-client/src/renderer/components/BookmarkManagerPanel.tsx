import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { BookmarkRecord, BookmarkSyncResult } from '@shared/types/bookmarks';

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
  width: 900px;
  max-width: 90%;
  height: 80%;
  background: #10131b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
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
    background: ${({ $variant }) => ($variant === 'ghost' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(79, 130, 255, 1)')};
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

const DEFAULT_ACCOUNT_ID = 1;
const EMPTY_FORM = {
  id: undefined as number | undefined,
  title: '',
  url: '',
  category: '',
  tags: ''
};

export const BookmarkManagerPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [syncStatus, setSyncStatus] = useState<BookmarkSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (open) {
      void loadBookmarks();
    }
  }, [open, loadBookmarks]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.url.trim()) {
      setError('標題與網址為必填');
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
            tags: form.tags || undefined
          }
        });
      } else {
        await window.electronAPI.bookmarks.add({
          accountId: DEFAULT_ACCOUNT_ID,
          title: form.title,
          url: form.url,
          category: form.category || undefined,
          tags: form.tags || undefined
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
      tags: record.tags ?? ''
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
    } catch (err) {
      setError('同步失敗，請檢查 WebDAV 設定');
      console.error(err);
    }
  };

  const helperText = useMemo(() => {
    if (error) {
      return error;
    }
    if (syncStatus) {
      return `最後同步：${new Date(syncStatus.lastSync).toLocaleString()}（來源：${syncStatus.source === 'local' ? '本地' : '遠端'}）`;
    }
    return '書籤儲存在本地 SQLite，可透過 WebDAV 同步';
  }, [error, syncStatus]);

  return (
    <Overlay $open={open}>
      <Panel>
        <Header>
          <Heading>書籤管理</Heading>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>
        <SearchBar>
          <Input placeholder="輸入關鍵字快速搜尋" value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSearch()} />
          <PrimaryButton type="button" onClick={handleSearch}>
            搜尋
          </PrimaryButton>
          <PrimaryButton type="button" onClick={handleSync} $variant="ghost">
            同步 WebDAV
          </PrimaryButton>
        </SearchBar>

        <ListContainer>
          {loading ? (
            <EmptyState>載入書籤中...</EmptyState>
          ) : bookmarks.length ? (
            bookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id}>
                <BookmarkTitle>{bookmark.title}</BookmarkTitle>
                <BookmarkMeta>
                  <span>{bookmark.url}</span>
                  {bookmark.category && <span>分類：{bookmark.category}</span>}
                  {bookmark.tags && <span>標籤：{bookmark.tags}</span>}
                </BookmarkMeta>
                <ActionRow>
                  <PrimaryButton type="button" onClick={() => handleEdit(bookmark)}>
                    編輯
                  </PrimaryButton>
                  <PrimaryButton type="button" $variant="ghost" onClick={() => handleDelete(bookmark.id)}>
                    刪除
                  </PrimaryButton>
                </ActionRow>
              </BookmarkCard>
            ))
          ) : (
            <EmptyState>尚未新增任何書籤</EmptyState>
          )}
        </ListContainer>

        <Form onSubmit={handleSubmit}>
          <Input placeholder="標題" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
          <Input placeholder="分類（選填）" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} />
          <FullWidth>
            <Input placeholder="網址" value={form.url} onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))} />
          </FullWidth>
          <Input placeholder="標籤（以逗號分隔）" value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} />
          <PrimaryButton type="submit">{form.id ? '更新書籤' : '新增書籤'}</PrimaryButton>
        </Form>

        <Footer>{helperText}</Footer>
      </Panel>
    </Overlay>
  );
};
