import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryCondition?: (error: any) => boolean;
}

export class RetryUtils {
  private static readonly logger = new Logger(RetryUtils.name);

  static async retry<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
    const { maxAttempts, delayMs, backoffMultiplier = 2, maxDelayMs = 30000, retryCondition = () => true } = options;

    let lastError: any;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt}/${maxAttempts}`);
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          this.logger.error(`All ${maxAttempts} attempts failed. Last error: ${error.message}`);
          throw error;
        }

        if (!retryCondition(error)) {
          this.logger.error(`Retry condition not met, aborting: ${error.message}`);
          throw error;
        }

        this.logger.warn(`Attempt ${attempt} failed: ${error.message}. Retrying in ${currentDelay}ms...`);

        await this.delay(currentDelay);

        // Exponential backoff
        currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
      }
    }

    throw lastError;
  }

  static async retryWithExponentialBackoff<T>(operation: () => Promise<T>, maxAttempts: 3, initialDelayMs: 1000): Promise<T> {
    return this.retry(operation, {
      maxAttempts,
      delayMs: initialDelayMs,
      backoffMultiplier: 2,
      maxDelayMs: 30000,
    });
  }

  static async retryApiCall<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
    return this.retry(operation, {
      maxAttempts,
      delayMs: 1000, // Reduced initial delay for faster retries
      backoffMultiplier: 1.5, // Less aggressive backoff
      maxDelayMs: 15000, // Reduced max delay
      retryCondition: (error) => {
        // Retry on network errors, timeouts, and 5xx status codes
        const err = error as any;
        if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
          return true;
        }

        if (err.response && err.response.status >= 500) {
          return true;
        }

        if (err.response && err.response.status === 429) {
          return true; // Rate limited
        }

        // Also retry on connection errors
        if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
          return true;
        }

        return false;
      },
    });
  }

  static async retryWithJitter<T>(operation: () => Promise<T>, options: RetryOptions): Promise<T> {
    const jitteredOptions = {
      ...options,
      delayMs: options.delayMs + Math.random() * 1000, // Add up to 1 second jitter
    };

    return this.retry(operation, jitteredOptions);
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static isRetriableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return true;
    }

    // HTTP errors
    if (error.response) {
      const status = error.response.status;
      // Retry on 5xx server errors and 429 rate limiting
      return status >= 500 || status === 429;
    }

    // Timeout errors
    if (error.message && error.message.toLowerCase().includes('timeout')) {
      return true;
    }

    return false;
  }

  static createRetryConfig(maxAttempts: 3, baseDelayMs: 1000, type: 'exponential' | 'linear' | 'fixed' = 'exponential'): RetryOptions {
    return {
      maxAttempts,
      delayMs: baseDelayMs,
      backoffMultiplier: type === 'exponential' ? 2 : type === 'linear' ? 1.5 : 1,
      maxDelayMs: 30000,
      retryCondition: this.isRetriableError,
    };
  }
}
