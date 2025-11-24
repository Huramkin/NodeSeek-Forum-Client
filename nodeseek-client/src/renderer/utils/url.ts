export const normalizeAddress = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'https://nodeseek.com/';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^[\w.-]+\.[a-z]{2,}$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  const encoded = encodeURIComponent(trimmed);
  return `https://www.google.com/search?q=${encoded}`;
};
