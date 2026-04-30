import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BookmarkRepository {
  constructor(private readonly prisma: PrismaService) {}

  // todo: have to  it to favorite module later
  async findBookmark(userId, attributeId, version) {
    return this.prisma.bookmark.findFirst({
      where: {
        userId,
        attributeId,
        attributeVersion: version,
      },
    });
  }

  async addBookmark(userId, attributeId, version) {
    return this.prisma.bookmark.create({
      data: {
        userId,
        attributeId,
        attributeVersion: version,
      },
    });
  }

  async removeBookmark(userId, attributeId, version) {
    return this.prisma.bookmark.deleteMany({
      where: {
        userId,
        attributeId,
        attributeVersion: version,
      },
    });
  }

  async getBookmarksByUser(userId) {
    return this.prisma.bookmark.findMany({
      where: { userId },
      include: {
        attribute: true, // Optional: include full attribute details
      },
    });
  }
}
