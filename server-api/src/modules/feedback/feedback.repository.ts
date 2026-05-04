import { Injectable } from '@nestjs/common';
import { CreateFeedbackDto } from '../attribute/dto/create-feedback.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class FeedbackRepository {
  constructor(private prisma: PrismaService) {}

  async createFeedback(feedbackData: CreateFeedbackDto) {
    const { userId, attributeId, version, type, categories, comment } = feedbackData;

    return this.prisma.feedback.create({
      data: {
        userId,
        attributeId,
        version: version || '',
        type,
        categories,
        comment,
      },
    });
  }

  async updateFeedback(userId: string, attributeId: string, version: string, updateData: Partial<CreateFeedbackDto>) {
    return this.prisma.feedback.update({
      where: {
        attributeId_version_userId: {
          userId,
          attributeId,
          version,
        },
      },
      data: updateData,
    });
  }

  async deleteFeedback(userId: string, attributeId: string, version: string) {
    return this.prisma.feedback.delete({
      where: {
        attributeId_version_userId: {
          userId,
          attributeId,
          version,
        },
      },
    });
  }

  async findFeedbackByAttribute(attributeId: string, version: string) {
    return this.prisma.feedback.findFirst({
      where: {
        attributeId,
        version,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async findAllFeedbacksByAttribute(attributeId: string, version: string) {
    return this.prisma.feedback.findMany({
      where: {
        attributeId,
        version,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async findUserFeedback(userId: string, attributeId: string, version: string) {
    return this.prisma.feedback.findUnique({
      where: {
        attributeId_version_userId: {
          attributeId,
          version,
          userId,
        },
      },
    });
  }

  async findAttributeById(attributeId: string) {
    return this.prisma.attribute.findFirst({
      where: {
        id: attributeId,
      },
    });
  }
}
