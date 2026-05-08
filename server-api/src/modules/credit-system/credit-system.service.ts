import { PrismaService } from 'prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CreditSystemService {
  constructor(private prisma: PrismaService) {}

  private getPricingValue(
    pricing: any | null | undefined,
    quality: string,
  ): number {
    if (!pricing) return 0;
    // Keys are stored exactly as resolution/quality used by services: '1K', '2K', '4K', 'video', etc.
    const value = pricing[quality];
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    return 0;
  }

  // Tìm theo model (endpoint id) + quality
  async getCreditsByModelAndQuality(modelId: string, quality: string) {
    const model = await this.prisma.model.findUnique({
      where: { id: modelId },
      select: { pricing: true },
    });

    if (!model) {
      return { credits: 0 };
    }

    const credits = this.getPricingValue(model.pricing, quality);
    return { credits };
  }

  async getRequiredCredits(
    modelIds: string[],
    quality: string,
  ): Promise<number> {
    if (!modelIds.length) return 0;

    const models = await this.prisma.model.findMany({
      where: { id: { in: modelIds } },
      select: { id: true, pricing: true },
    });

    const totalCredits = models.reduce((sum, model) => {
      const credits = this.getPricingValue(model.pricing, quality);
      return sum + credits;
    }, 0);

    return totalCredits;
  }
}
