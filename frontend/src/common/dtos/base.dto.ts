export interface BobbyResponse<T> {
    data: T;
    total: number;
    page: number;
    limit: number;
}

export interface BaseResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

