import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import configuration from '../utils/configuration';

@Injectable()
export class FileLogger implements LoggerService {
  private readonly NODE_ENV: string;
  private readonly LOGGING_LEVEL: string;
  private readonly LOGGING_DAYS: number;
  private readonly LOGGING_FOLDER_PATH: string;
  private readonly logger: winston.Logger;
  private readonly logName: string = 'image-worker';

  constructor() {
    const configValues = configuration();
    this.NODE_ENV = configValues.NODE_ENV || 'development';
    this.LOGGING_LEVEL = configValues.LOGGING_LEVEL || 'debug';
    this.LOGGING_DAYS = parseInt(configValues.LOGGING_DAYS) || 7;
    this.LOGGING_FOLDER_PATH = configValues.LOGGING_FOLDER_PATH || 'logs';

    // Initialize logger
    this.logger = winston.createLogger({
      level: this.LOGGING_LEVEL,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, context, message }) => {
          return `${timestamp} ${level.toUpperCase()} [${context || this.NODE_ENV}]: ${message}`;
        }),
      ),
      transports: [
        new winston.transports.Console(),
        new DailyRotateFile({
          filename: `${this.LOGGING_FOLDER_PATH}/%DATE%-${this.logName}.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: `${this.LOGGING_DAYS}d`,
        }),
      ],
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(message: any, ...optionalParams: any[]): void {
    const context = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;

    if (typeof message === 'string') {
      this.logger.info(message, { context });
    } else {
      this.logger.info(JSON.stringify(message), { context });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error(message: any, ...optionalParams: any[]): void {
    const context = optionalParams.length > 0 ? optionalParams.pop() : undefined;
    const trace = optionalParams.length > 0 ? optionalParams.pop() : undefined;

    if (typeof message === 'string') {
      this.logger.error(message, {
        trace,
        context,
        additionalParams: optionalParams,
      });
    } else {
      this.logger.error(JSON.stringify(message), {
        trace,
        context,
        additionalParams: optionalParams,
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn(message: any, ...optionalParams: any[]): void {
    const context = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;

    if (typeof message === 'string') {
      this.logger.warn(message, { context });
    } else {
      this.logger.warn(JSON.stringify(message), { context });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug(message: any, ...optionalParams: any[]): void {
    const context = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;

    if (typeof message === 'string') {
      this.logger.debug(message, { context });
    } else {
      this.logger.debug(JSON.stringify(message), { context });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verbose(message: any, ...optionalParams: any[]): void {
    const context = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;

    if (typeof message === 'string') {
      this.logger.verbose(message, { context });
    } else {
      this.logger.verbose(JSON.stringify(message), { context });
    }
  }
}
