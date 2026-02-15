export const normalizeAddress = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'https://nodeseek.com/';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // 匹配裸域名，支持带路径、查询参数和锚点
  if (/^[\w.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  const encoded = encodeURIComponent(trimmed);
  return `https://www.google.com/search?q=${encoded}`;
};
