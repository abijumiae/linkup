const FAVORITES_KEY = "linkup_market_favorites";

export function getMarketFavorites(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function isMarketFavorite(id: string): boolean {
  return getMarketFavorites().includes(id);
}

export function toggleMarketFavorite(id: string): boolean {
  const current = getMarketFavorites();
  const exists = current.includes(id);
  const next = exists
    ? current.filter((itemId) => itemId !== id)
    : [...current, id];

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return !exists;
}
