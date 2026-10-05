import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { ApiException } from './api-error';

/** Adds Retry-After to rate-limit responses of the generation API. */
@Catch(ApiException)
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: ApiException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception.retryAfterSeconds !== undefined) response.setHeader('Retry-After', String(exception.retryAfterSeconds));
    response.status(exception.getStatus()).json(exception.getResponse());
  }
}
