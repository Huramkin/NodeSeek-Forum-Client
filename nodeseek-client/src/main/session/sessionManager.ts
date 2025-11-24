import { session, CookiesGetFilter, CookiesSetDetails, Cookies } from 'electron';
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

const WEBVIEW_PARTITION = 'persist:nodeseek';

export class SessionManager {
  private cache = new Map<string, StoredCookie[]>();
  private readonly partitionSession = session.fromPartition(WEBVIEW_PARTITION);

  constructor(private readonly config: AppConfig) {}

  async captureSnapshot(key: string): Promise<void> {
    if (!this.config.session.persistCookies) {
      return;
    }
    const cookies = await this.partitionSession.cookies.get({
      domain: this.config.session.cookieDomain
    } satisfies CookiesGetFilter);
    this.cache.set(key, cookies as StoredCookie[]);
  }

  async restoreSnapshot(key: string): Promise<void> {
    if (!this.config.session.persistCookies) {
      return;
    }
    const cookies = this.cache.get(key);
    if (!cookies?.length) {
      return;
    }
    await this.removeDomainCookies();
    for (const cookie of cookies) {
      await this.partitionSession.cookies.set(cookie as CookiesSetDetails);
    }
  }

  dropSnapshot(key: string): void {
    this.cache.delete(key);
  }

  async clearCookies(key?: string): Promise<void> {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
    const cookies = await this.partitionSession.cookies.get({});
    await Promise.all(
      cookies.map((cookie) => this.partitionSession.cookies.remove(this.composeCookieUrl(cookie), cookie.name))
    );
  }

  async syncAcrossTabs(): Promise<void> {
    if (!this.config.session.shareAcrossTabs) {
      return;
    }
    await this.partitionSession.cookies.flushStore();
  }

  private async removeDomainCookies(): Promise<void> {
    const domainCookies = await this.partitionSession.cookies.get({
      domain: this.config.session.cookieDomain
    } satisfies CookiesGetFilter);
    await Promise.all(
      domainCookies.map((cookie) => this.partitionSession.cookies.remove(this.composeCookieUrl(cookie), cookie.name))
    );
  }

  private composeCookieUrl(cookie: Cookies.Cookie): string {
    const scheme = cookie.secure ? 'https' : 'http';
    const domain = cookie.domain?.startsWith('.') ? cookie.domain.slice(1) : cookie.domain ?? '';
    const path = cookie.path ?? '/';
    return `${scheme}://${domain}${path}`;
  }
}
