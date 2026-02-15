/**
 * Input validation and sanitization utilities
 */

const URL_REGEX =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * Validates a URL string
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return URL_REGEX.test(url);
  } catch {
    return false;
  }
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates bookmark title
 */
export function validateBookmarkTitle(title: string): { valid: boolean; error?: string } {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: '標題為必填項' };
  }

  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '標題不能為空' };
  }

  if (trimmed.length > 200) {
    return { valid: false, error: '標題長度不能超過 200 個字符' };
  }

  return { valid: true };
}

/**
 * Validates bookmark URL
 */
export function validateBookmarkUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: '網址為必填項' };
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '網址不能為空' };
  }

  if (!isValidUrl(trimmed)) {
    return { valid: false, error: '請輸入有效的網址格式（http:// 或 https://）' };
  }

  return { valid: true };
}

/**
 * Validates folder name
 */
export function validateFolderName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: '資料夾名稱為必填項' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: '資料夾名稱不能為空' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: '資料夾名稱長度不能超過 100 個字符' };
  }

  // Check for invalid characters
  if (/[<>:"/\\|?*]/.test(trimmed)) {
    return { valid: false, error: '資料夾名稱包含無效字符' };
  }

  return { valid: true };
}

/**
 * Validates tags string
 */
export function validateTags(tags: string): { valid: boolean; error?: string } {
  if (!tags) {
    return { valid: true }; // Tags are optional
  }

  if (typeof tags !== 'string') {
    return { valid: false, error: '標籤格式錯誤' };
  }

  if (tags.length > 500) {
    return { valid: false, error: '標籤總長度不能超過 500 個字符' };
  }

  return { valid: true };
}

/**
 * Sanitizes and parses tags from a comma-separated string
 */
export function parseTags(tagsString: string): string[] {
  if (!tagsString || typeof tagsString !== 'string') {
    return [];
  }

  return tagsString
    .split(',')
    .map((tag) => sanitizeHtml(tag.trim()))
    .filter((tag) => tag.length > 0 && tag.length <= 50);
}

/**
 * Rate limiter for operations
 */
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  /**
   * Checks if the rate limit is exceeded
   */
  isRateLimited(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return true;
    }

    this.requests.push(now);
    return false;
  }

  /**
   * Resets the rate limiter
   */
  reset(): void {
    this.requests = [];
  }
}
