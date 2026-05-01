import { apiClient } from '@/services/api/client';

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const getLatestNotifications = async (limit = 10): Promise<NotificationItem[]> => {
  try {
    const response = await apiClient.get<NotificationItem[]>(`/notifications/latest?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  const response = await apiClient.patch<{ id: string; isRead: boolean }>(`/notifications/${notificationId}/read`, []);
  return response.data;
};

export const deleteNotification = async (notificationId: string) => {
  const response = await apiClient.delete<{ success: boolean }>(`/notifications/${notificationId}`);
  return response.data;
};

