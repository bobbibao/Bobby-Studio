export interface ApiResponse<T> {
  error?: boolean;
  payload?: T;
  message?: string;
}

export interface PaginatedPayload<T> {
  current_page: number;
  items: T[];
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<PaginatedPayload<T>> {}

export function mapApiResponse<T>(response: ApiResponse<T>): T {
  if (response.error) {
    throw new Error(response.message || 'API Error');
  }

  return response.payload as T;
}

