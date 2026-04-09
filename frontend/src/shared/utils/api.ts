export function buildQueryString(params: Record<string, unknown>): string {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => `${key}=${encodeURIComponent(String(item))}`);
      }

      return `${key}=${encodeURIComponent(String(value))}`;
    })
    .join('&');

  return query ? `?${query}` : '';
}

