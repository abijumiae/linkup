import { apiRequest, ApiError } from "./api";
import { PaginatedResponse, unwrapPaginated } from "./pagination";
import { clearAuth, getToken } from "./auth";

export interface MarketplaceSeller {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  condition: string | null;
  location: string | null;
  imageUrl: string | null;
  sellerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  seller: MarketplaceSeller;
  isOwner: boolean;
}

export interface CreateListingPayload {
  title: string;
  description: string;
  price: number;
  currency?: string;
  category: string;
  condition?: string;
  location?: string;
  imageUrl?: string;
}

export interface UpdateListingPayload {
  title?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  condition?: string;
  location?: string;
  imageUrl?: string;
}

export interface MarketplaceFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "trending" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

function authHeaders(): HeadersInit {
  const token = getToken();

  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function withAuth<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuth();
    }
    throw error;
  }
}

export function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export async function fetchMarketplaceItems(
  filters: MarketplaceFilters = {},
): Promise<PaginatedResponse<MarketplaceItem>> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.category?.trim()) params.set("category", filters.category.trim());
  if (filters.minPrice !== undefined)
    params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined)
    params.set("maxPrice", String(filters.maxPrice));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const path = query ? `/marketplace?${query}` : "/marketplace";

  return withAuth(() =>
    apiRequest<PaginatedResponse<MarketplaceItem> | MarketplaceItem[]>(
      path,
      {
        headers: authHeaders(),
      },
    ).then(unwrapPaginated),
  );
}

export async function fetchMarketplaceItemsSafe(
  filters: MarketplaceFilters = {},
): Promise<{
  items: MarketplaceItem[];
  hasMore: boolean;
  warning: string | null;
}> {
  try {
    const data = await fetchMarketplaceItems(filters);
    return { items: data.items, hasMore: data.hasMore, warning: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
    return {
      items: [],
      hasMore: false,
      warning: "Market listings are warming up. Showing local filters only.",
    };
  }
}

export function sortMarketplaceItems(
  items: MarketplaceItem[],
  sort: MarketplaceFilters["sort"] = "newest",
): MarketplaceItem[] {
  const copy = [...items];

  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price_desc":
      return copy.sort((a, b) => b.price - a.price);
    case "trending":
    case "newest":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}

export async function fetchMarketplaceItem(
  id: string,
): Promise<MarketplaceItem> {
  return withAuth(() =>
    apiRequest<MarketplaceItem>(`/marketplace/${id}`, {
      headers: authHeaders(),
    }),
  );
}

export async function createListing(
  payload: CreateListingPayload,
): Promise<MarketplaceItem> {
  return withAuth(() =>
    apiRequest<MarketplaceItem>("/marketplace", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateListing(
  id: string,
  payload: UpdateListingPayload,
): Promise<MarketplaceItem> {
  return withAuth(() =>
    apiRequest<MarketplaceItem>(`/marketplace/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),
  );
}

export async function deleteListing(id: string): Promise<{ message: string }> {
  return withAuth(() =>
    apiRequest<{ message: string }>(`/marketplace/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }),
  );
}
