export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  pagination: PaginationMeta;
};

export function createPaginatedResponse<TItem>(
  items: TItem[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<TItem> {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
