import { Injectable, NotFoundException } from '@nestjs/common';
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

  /** Scoped to the owner: another user's notification id behaves like a missing one. */
  async markAsRead(notificationId: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    if (result.count === 0) throw new NotFoundException('Notification not found');
    return { id: notificationId, isRead: true };
  }

  async deleteNotification(notificationId: string, userId: string) {
    const result = await this.prisma.notification.deleteMany({ where: { id: notificationId, userId } });
    if (result.count === 0) throw new NotFoundException('Notification not found');
    return { id: notificationId };
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
