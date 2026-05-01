import { Exclude, Expose } from 'class-transformer';

export class NotificationDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  type: string;

  @Expose()
  title: string;

  @Expose()
  message: string;

  @Expose()
  isRead: boolean;

  @Expose()
  createdAt: Date;

  @Exclude() // Ẩn trường `data`
  data?: any;
}
