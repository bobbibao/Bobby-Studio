import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  // todo: have to  it to favorite module later
  async findFavorite(userId: string, attributeId: string, version: string) {
    return this.prisma.favorite.findFirst({
      where: {
        userId,
        attributeId,
        attributeVersion: version,
      },
    });
  }

  async addFavorite(userId: string, attributeId: string, version: string) {
    return this.prisma.favorite.create({
      data: {
        userId,
        attributeId,
        attributeVersion: version,
      },
    });
  }

  async removeFavorite(userId: string, attributeId: string, version: string) {
    return this.prisma.favorite.deleteMany({
      where: {
        userId,
        attributeId,
        attributeVersion: version,
      },
    });
  }

  async getFavoritesByUser(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        attribute: true, // Optional: include full attribute details
      },
    });
  }
}
