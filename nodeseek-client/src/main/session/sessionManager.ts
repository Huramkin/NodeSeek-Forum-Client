import { session, CookiesGetFilter, CookiesSetDetails } from 'electron';
import { AppConfig } from '@shared/types/config';

export interface StoredCookie {
  name: string;
  value: string;
  domain?: string;
  hostOnly?: boolean;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expirationDate?: number;
}

export class SessionManager {
  private cache = new Map<string, StoredCookie[]>();

  constructor(private readonly config: AppConfig) {}

  async saveCookies(accountId: string): Promise<void> {
    if (!this.config.session.persistCookies) {
      return;
    }
    const cookies = await session.defaultSession.cookies.get({
      domain: this.config.session.cookieDomain
    } satisfies CookiesGetFilter);
    this.cache.set(accountId, cookies as StoredCookie[]);
  }

  async loadCookies(accountId: string): Promise<void> {
    const cookies = this.cache.get(accountId);
    if (!cookies?.length) {
      return;
    }
    for (const cookie of cookies) {
      await session.defaultSession.cookies.set(cookie as CookiesSetDetails);
    }
  }

  async clearCookies(accountId?: string): Promise<void> {
    if (accountId) {
      this.cache.delete(accountId);
    } else {
      this.cache.clear();
    }
    const cookies = await session.defaultSession.cookies.get({});
    await Promise.all(
      cookies.map((cookie) => session.defaultSession.cookies.remove(`http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`, cookie.name))
    );
  }

  async syncAcrossTabs(): Promise<void> {
    if (!this.config.session.shareAcrossTabs) {
      return;
    }
    // webview 共用同一 partition，主進程只需確保 defaultSession 內容準確
    await session.defaultSession.cookies.flushStore();
  }
}
