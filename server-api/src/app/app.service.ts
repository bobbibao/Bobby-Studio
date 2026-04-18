import { Injectable } from '@nestjs/common';
interface GetDataResponse {
  stripe_api_key: string;
  msg: string;
  database_url: string;
  shadow_database_url: string;
}

@Injectable()
export class AppService {
  private readonly stripeApiKey =
    process.env.STRIPE_API_KEY || 'STRIPE_API_KEY-empty';

  private mask(str: string | undefined, n: number): string {
    if (!str) return 'N/A';
    return str.length <= n ? str : '*'.repeat(str.length - n) + str.slice(-n);
  }

  private getMaskedValue(key: string, n: number, isDebug: boolean): string {
    return isDebug ? this.mask(process.env[key], n) : 'denied';
  }

  getData(isDebug = false): GetDataResponse {
    const sensitiveEnvVars: Record<
      keyof GetDataResponse,
      { key: string; maskLength: number }
    > = {
      stripe_api_key: { key: 'STRIPE_API_KEY', maskLength: 10 },
      database_url: { key: 'DATABASE_URL', maskLength: 12 },
      shadow_database_url: { key: 'SHADOW_DATABASE_URL', maskLength: 12 },
      msg: { key: '', maskLength: 0 }, // Không cần mask
    };

    const maskedData = Object.entries(sensitiveEnvVars).reduce(
      (acc, [field, { key, maskLength }]) => {
        acc[field as keyof GetDataResponse] = key
          ? this.getMaskedValue(key, maskLength, isDebug)
          : 'test fly: 0.0.1';
        return acc;
      },
      {} as GetDataResponse,
    );

    return maskedData;
  }
}
