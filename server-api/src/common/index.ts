export class BobbyResponse<T> {
    data: T;
    total: number;
    page: number;
    limit: number;
}

export class BaseResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}
