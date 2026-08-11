export type ApiResponse<TData> = {
  data: TData;
  timestamp: string;
};

export function createApiResponse<TData>(data: TData): ApiResponse<TData> {
  return {
    data,
    timestamp: new Date().toISOString(),
  };
}
