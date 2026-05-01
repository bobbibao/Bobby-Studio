import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { NotificationRepository } from './notification.repository';
import { NotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async getNotifications(userId: string, limit = 10) {
    const notifications = await this.notificationRepository.getLatestNotifications(userId, limit);
    return notifications.map(n => plainToInstance(NotificationDto, n));
  }

  async markNotificationAsRead(notificationId: string) {
    return this.notificationRepository.markAsRead(notificationId);
  }

  async deleteNotification(notificationId: string) {
    return this.notificationRepository.deleteNotification(notificationId);
  }

  async createNotification(userId: string | undefined, title: string, message: string, type: string, data?: any ) {
    // Can configure sending mail/SMS here
    return this.notificationRepository.createNotification({
      userId, // if null => global
      title,
      message,
      data, // renamed to match repository function
      type, // added required type parameter
    });
  }
}
