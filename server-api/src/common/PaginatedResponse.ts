interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  message?: string;
  nextCursor?: string;
  previousCursor?: string;
}
