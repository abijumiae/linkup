export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 50;

export type PaginationParams = {
  limit: number;
  skip: number;
  page: number;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  hasMore: boolean;
};

export function parsePaginationQuery(query: {
  limit?: string;
  page?: string;
}): PaginationParams {
  const parsedLimit = Number.parseInt(query.limit ?? '', 10);
  const parsedPage = Number.parseInt(query.page ?? '', 10);

  const limit = Math.min(
    Math.max(Number.isFinite(parsedLimit) ? parsedLimit : DEFAULT_PAGE_LIMIT, 1),
    MAX_PAGE_LIMIT,
  );
  const page = Math.max(Number.isFinite(parsedPage) ? parsedPage : 1, 1);

  return {
    limit,
    page,
    skip: (page - 1) * limit,
  };
}

export function buildPaginatedResult<T>(
  rows: T[],
  pagination: PaginationParams,
): PaginatedResult<T> {
  const hasMore = rows.length > pagination.limit;
  const items = hasMore ? rows.slice(0, pagination.limit) : rows;

  return {
    items,
    page: pagination.page,
    limit: pagination.limit,
    hasMore,
  };
}
