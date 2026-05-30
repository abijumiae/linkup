export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export function unwrapPaginated<T>(
  data: PaginatedResponse<T> | T[],
): PaginatedResponse<T> {
  if (Array.isArray(data)) {
    return {
      items: data,
      page: 1,
      limit: data.length,
      hasMore: false,
    };
  }

  return data;
}
