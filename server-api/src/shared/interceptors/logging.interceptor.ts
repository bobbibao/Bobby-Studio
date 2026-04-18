import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;

          // Log successful requests as structured data
          const logData = {
            method,
            url,
            statusCode,
            responseTime: `${responseTime}ms`,
            ip,
            userAgent,
          };

          this.logger.log(JSON.stringify(logData));
        },
        error: (error) => {
          const response = context.switchToHttp().getResponse();
          const statusCode = error.status || 500;
          const responseTime = Date.now() - startTime;

          // Log error requests as structured data
          const logData = {
            method,
            url,
            statusCode,
            responseTime: `${responseTime}ms`,
            ip,
            userAgent,
            error: error.message,
          };

          this.logger.error(JSON.stringify(logData), error.stack);
        },
      }),
    );
  }
}
