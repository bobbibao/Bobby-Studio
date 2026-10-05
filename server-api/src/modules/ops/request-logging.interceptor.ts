import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthenticatedRequest } from '../identity/principal';

const SKIP = new Set(['/api/health/live', '/api/health/ready', '/api/metrics']);
const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/**
 * One structured line per request. Logs the route pattern (never the raw URL: signed access tokens live
 * in query strings), status, duration and correlation ids, and never bodies, prompts or tokens.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { route?: { path?: string } }>();
    const response = context.switchToHttp().getResponse<Response>();
    const inbound = request.headers['x-request-id'];
    const requestId = typeof inbound === 'string' && REQUEST_ID.test(inbound) ? inbound : randomUUID();
    response.setHeader('X-Request-Id', requestId);
    if (SKIP.has(request.path)) return next.handle();

    const started = Date.now();
    const line = (status: number, error?: string) =>
      JSON.stringify({
        requestId,
        method: request.method,
        route: request.route?.path ?? 'unmatched',
        status,
        durationMs: Date.now() - started,
        userId: request.currentUser?.id,
        ...(error ? { error } : {}),
      });
    return next.handle().pipe(
      tap({
        next: () => this.logger.log(line(response.statusCode)),
        error: (error: { status?: number; message?: string }) => this.logger.warn(line(error.status ?? 500, (error.message ?? '').slice(0, 200))),
      }),
    );
  }
}
