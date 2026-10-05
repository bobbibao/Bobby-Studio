import { HttpException } from '@nestjs/common';
import { ApiErrorBody, ApiErrorCode } from './contracts';

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  410: 'Gone',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  503: 'Service Unavailable',
};

/** HTTP error with the stable body shape of the public generation API (ApiErrorBody). */
export class ApiException extends HttpException {
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options: { fieldErrors?: ApiErrorBody['fieldErrors']; retryAfterSeconds?: number } = {},
  ) {
    const body: ApiErrorBody = {
      statusCode: status,
      error: STATUS_TEXT[status] ?? 'Error',
      message,
      code,
      ...(options.fieldErrors ? { fieldErrors: options.fieldErrors } : {}),
    };
    super(body, status);
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}
