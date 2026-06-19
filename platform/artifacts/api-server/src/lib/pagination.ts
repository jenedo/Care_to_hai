export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function getFirstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function parsePositiveInteger(
  value: unknown,
  defaultValue: number,
): number {
  const raw = getFirstQueryValue(value);

  if (!raw) {
    return defaultValue;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return Math.floor(parsed);
}

export function parsePagination(
  query: Record<string, unknown>,
): PaginationParams {
  const page = Math.max(
    1,
    parsePositiveInteger(query.page, DEFAULT_PAGE),
  );

  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parsePositiveInteger(query.limit, DEFAULT_LIMIT)),
  );

  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}

export function paginate<T>(
  items: T[],
  { page, limit }: PaginationParams,
): PaginatedResult<T> {
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  const data = items.slice(offset, offset + limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1 && totalPages > 0,
  };
}

export function createPaginatedResult<T>(
  data: T[],
  total: number,
  { page, limit }: PaginationParams,
): PaginatedResult<T> {
  const safeTotal = Math.max(0, total);
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / limit);

  return {
    data,
    total: safeTotal,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1 && totalPages > 0,
  };
}




// export interface PaginationParams {
//   page: number;
//   limit: number;
// }

// export interface PaginatedResult<T> {
//   data: T[];
//   total: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }

// export function parsePagination(query: Record<string, string>): PaginationParams {
//   const page = Math.max(1, parseInt(query.page ?? "1") || 1);
//   const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "10") || 10));
//   return { page, limit };
// }

// export function paginate<T>(items: T[], { page, limit }: PaginationParams): PaginatedResult<T> {
//   const total = items.length;
//   const totalPages = Math.ceil(total / limit);
//   const data = items.slice((page - 1) * limit, page * limit);
//   return { data, total, page, limit, totalPages };
// }
