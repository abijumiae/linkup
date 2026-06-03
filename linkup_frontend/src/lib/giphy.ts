export type GifItem = {
  id: string;
  url: string;
  preview: string;
  title: string;
};

function mapGiphyEntry(entry: unknown): GifItem | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const row = entry as {
    id?: string;
    title?: string;
    images?: {
      fixed_height_small?: { url?: string };
      preview_gif?: { url?: string };
      downsized?: { url?: string };
    };
  };
  const url =
    row.images?.fixed_height_small?.url ??
    row.images?.downsized?.url ??
    row.images?.preview_gif?.url;
  if (!row.id || !url) {
    return null;
  }
  return {
    id: row.id,
    url,
    preview: row.images?.preview_gif?.url ?? url,
    title: row.title?.trim() || "GIF",
  };
}

/** Safe Giphy fetch — returns [] when key missing or request fails. */
export async function fetchTrendingGifs(limit = 8): Promise<GifItem[]> {
  const key = process.env.NEXT_PUBLIC_GIPHY_API_KEY?.trim();
  if (!key) {
    return [];
  }
  try {
    const params = new URLSearchParams({
      api_key: key,
      limit: String(Math.min(Math.max(limit, 1), 25)),
      rating: "g",
    });
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/trending?${params.toString()}`,
        { signal: controller.signal },
      );
      if (!res.ok) {
        return [];
      }
      const json = (await res.json()) as { data?: unknown[] };
      const list = Array.isArray(json?.data) ? json.data : [];
      return list
        .map(mapGiphyEntry)
        .filter((item): item is GifItem => item != null);
    } finally {
      window.clearTimeout(timeoutId);
    }
  } catch {
    return [];
  }
}
