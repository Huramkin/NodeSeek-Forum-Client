import { describe, expect, it } from 'vitest';
import { normalizeAddress } from '../url';

describe('normalizeAddress', () => {
  it('returns default homepage when input is empty', () => {
    expect(normalizeAddress('')).toBe('https://nodeseek.com/');
  });

  it('keeps full URLs unchanged', () => {
    expect(normalizeAddress('https://example.com/path')).toBe('https://example.com/path');
  });

  it('prepends protocol for plain domains', () => {
    expect(normalizeAddress('nodeseek.com')).toBe('https://nodeseek.com');
  });

  it('prepends protocol for domains with paths', () => {
    expect(normalizeAddress('nodeseek.com/post/123')).toBe('https://nodeseek.com/post/123');
  });

  it('prepends protocol for domains with query params', () => {
    expect(normalizeAddress('nodeseek.com/search?q=test')).toBe('https://nodeseek.com/search?q=test');
  });

  it('builds search URL for keywords', () => {
    expect(normalizeAddress('測試 關鍵字')).toBe(
      'https://www.google.com/search?q=%E6%B8%AC%E8%A9%A6%20%E9%97%9C%E9%8D%B5%E5%AD%97'
    );
  });
});
