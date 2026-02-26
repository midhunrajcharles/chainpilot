import { ApiResponse, NotificationParams, NotificationSubscription } from '@/types/api';
import { BaseApiClient } from './base';

export class NotificationApiClient extends BaseApiClient {
  static async getNotifications(
    walletAddress: string, 
    params?: NotificationParams
  ): Promise<ApiResponse<unknown>> {
    return this.get<unknown>('/notifications', walletAddress, params as Record<string, string | number | boolean | undefined>);
  }

  static async markNotificationsAsRead(
    walletAddress: string, 
    notificationIds: string[]
  ): Promise<ApiResponse<{ modifiedCount: number }>> {
    return this.post<{ modifiedCount: number }>('/notifications/mark-read', walletAddress, { notificationIds });
  }

  static async subscribeToNotifications(
    walletAddress: string, 
    data: { 
      type: 'email' | 'push' | 'sms'; 
      endpoint?: string; 
      events: string[] 
    }
  ): Promise<ApiResponse<NotificationSubscription>> {
    return this.post<NotificationSubscription>('/notifications/subscribe', walletAddress, data);
  }

  static async getNotificationSubscriptions(walletAddress: string): Promise<ApiResponse<NotificationSubscription[]>> {
    return this.get<NotificationSubscription[]>('/notifications/subscriptions', walletAddress);
  }

  static async deleteNotificationSubscription(
    walletAddress: string, 
    subscriptionId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/notifications/subscriptions/${subscriptionId}`, walletAddress);
  }
}
