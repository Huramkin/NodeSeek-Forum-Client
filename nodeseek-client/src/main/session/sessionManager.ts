import { session, CookiesGetFilter, CookiesSetDetails } from 'electron';
import type { Cookie } from 'electron';
import Store from 'electron-store';
import { ConfigService } from '../services/configService';

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

interface SessionState {
  [key: string]: StoredCookie[];
}

export class SessionManager {
  private cache = new Map<string, StoredCookie[]>();
  private readonly partitionSession = session.fromPartition(WEBVIEW_PARTITION);
  private readonly store: Store;

  constructor(private readonly configService: ConfigService) {
    this.store = new Store({
      name: 'session-state'
    });
    // Load persisted sessions on startup
    this.loadPersistedSessions();
  }

  private get config() {
    return this.configService.getConfig();
  }

  /**
   * Load persisted cookie snapshots from disk
   */
  private loadPersistedSessions(): void {
    if (!this.config.session.persistCookies) {
      return;
    }

    try {
      const savedState = this.store.get('sessions') as SessionState | undefined;
      if (savedState) {
        for (const [key, cookies] of Object.entries(savedState)) {
          this.cache.set(key, cookies);
        }
        console.log(`[SessionManager] Restored ${this.cache.size} session(s) from disk`);
      }
    } catch (error) {
      console.error('[SessionManager] Failed to load persisted sessions:', error);
    }
  }

  /**
   * Persist cookie snapshots to disk
   */
  private savePersistedSessions(): void {
    if (!this.config.session.persistCookies) {
      return;
    }

    try {
      const state: SessionState = {};
      for (const [key, cookies] of this.cache.entries()) {
        state[key] = cookies;
      }
      this.store.set('sessions', state);
    } catch (error) {
      console.error('[SessionManager] Failed to save persisted sessions:', error);
    }
  }

  /**
   * Cleanup and save final state
   */
  dispose(): void {
    this.savePersistedSessions();
  }

  async captureSnapshot(key: string): Promise<void> {
    if (!this.config.session.persistCookies) {
      return;
    }
    const cookies = await this.partitionSession.cookies.get({
      domain: this.config.session.cookieDomain
    } satisfies CookiesGetFilter);
    this.cache.set(key, cookies as StoredCookie[]);
    this.savePersistedSessions();
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
    this.savePersistedSessions();
  }

  async clearCookies(key?: string): Promise<void> {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
    this.savePersistedSessions();
    const cookies = await this.partitionSession.cookies.get({});
    await Promise.all(
      cookies.map((cookie) =>
        this.partitionSession.cookies.remove(this.composeCookieUrl(cookie), cookie.name)
      )
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
      domainCookies.map((cookie) =>
        this.partitionSession.cookies.remove(this.composeCookieUrl(cookie), cookie.name)
      )
    );
  }

  private composeCookieUrl(cookie: Cookie): string {
    const scheme = cookie.secure ? 'https' : 'http';
    const domain = cookie.domain?.startsWith('.') ? cookie.domain.slice(1) : (cookie.domain ?? '');
    const path = cookie.path ?? '/';
    return `${scheme}://${domain}${path}`;
  }
}
