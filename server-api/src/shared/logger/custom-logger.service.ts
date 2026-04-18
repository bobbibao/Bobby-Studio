import { LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

export class CustomLogger implements LoggerService {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  log(message: string | object, context?: string) {
    this.printMessage('log', message, context);
  }

  error(message: string | object, trace?: string, context?: string) {
    this.printMessage('error', message, context, trace);
  }

  warn(message: string | object, context?: string) {
    this.printMessage('warn', message, context);
  }

  debug(message: string | object, context?: string) {
    if (!this.isProduction) {
      this.printMessage('debug', message, context);
    }
  }

  verbose(message: string | object, context?: string) {
    if (!this.isProduction) {
      this.printMessage('verbose', message, context);
    }
  }

  private printMessage(
    level: LogLevel,
    message: string | object,
    context?: string,
    trace?: string,
  ) {
    if (this.isProduction) {
      // Google Cloud Logging structured format
      const logEntry = {
        severity: this.mapSeverity(level),
        message:
          typeof message === 'string' ? message : JSON.stringify(message),
        timestamp: new Date().toISOString(),
        ...(context && { context }),
        ...(trace && { trace }),
      };
      console.log(JSON.stringify(logEntry));
    } else {
      // Development format - more readable
      const timestamp = new Date().toISOString();
      const contextStr = context ? `[${context}] ` : '';
      const levelStr = level.toUpperCase().padEnd(7);
      console.log(`${timestamp} ${levelStr} ${contextStr}${message}`);
      if (trace) {
        console.log(trace);
      }
    }
  }

  private mapSeverity(level: LogLevel): string {
    const severityMap: Record<LogLevel, string> = {
      log: 'INFO',
      error: 'ERROR',
      warn: 'WARNING',
      debug: 'DEBUG',
      verbose: 'DEBUG',
    };
    return severityMap[level] || 'INFO';
  }
}
