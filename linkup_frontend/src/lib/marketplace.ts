import { apiRequest, ApiError } from "./api";
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
): Promise<MarketplaceItem[]> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.category?.trim()) params.set("category", filters.category.trim());
  if (filters.minPrice !== undefined)
    params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined)
    params.set("maxPrice", String(filters.maxPrice));

  const query = params.toString();
  const path = query ? `/marketplace?${query}` : "/marketplace";

  return withAuth(() =>
    apiRequest<MarketplaceItem[]>(path, {
      headers: authHeaders(),
    }),
  );
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
