export interface PaginationType {
  pageSize: number;
  currentPage: number;
  total: number;
  pages: number;
  // Keyset pagination cursors
  lastCreatedAt?: string;
  lastId?: string;
  hasNextPage?: boolean;
}

