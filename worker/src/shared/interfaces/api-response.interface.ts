export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId?: string;
    version?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface WebhookPayload {
  event: string;
  data: any;
}
