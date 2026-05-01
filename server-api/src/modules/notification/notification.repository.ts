import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getLatestNotifications(userId: string, limit = 10) {
    const takeLimit = Number(limit) || 10;
    return this.prisma.notification.findMany({
      where: {
        OR: [{ userId: userId }, { userId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: takeLimit,
    });
  }

  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }, // Giả sử có trường isRead: boolean
    });
  }

  async deleteNotification(notificationId: string) {
    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async createNotification(data: { userId?: string; title: string; message: string; data?: object; type: string }) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        data: data.data ? data.data : undefined,
        type: data.type,
      },
    });
  }
}
