export type ApiEnvelope<TData> = {
  data: TData;
  timestamp: string;
};

export type PaginatedResponse<TItem> = {
  items: TItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
