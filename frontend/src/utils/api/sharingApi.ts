import { BaseApiClient } from './base';
import { ApiResponse } from '@/types/api';

export class SharingApiClient extends BaseApiClient {
  static async generateQR(
    walletAddress: string, 
    transactionId: string
  ): Promise<ApiResponse<{ qrCode: string; shareUrl: string }>> {
    return this.post<{ qrCode: string; shareUrl: string }>('/sharing/generate-qr', walletAddress, { transactionId });
  }

  static async generateReceipt(
    walletAddress: string, 
    transactionId: string, 
    format: 'pdf' | 'image'
  ): Promise<ApiResponse<{ url: string; data: string }>> {
    return this.post<{ url: string; data: string }>('/sharing/generate-receipt', walletAddress, { transactionId, format });
  }

  static async createSocialShare(
    walletAddress: string, 
    data: { 
      transactionId: string; 
      platform: 'twitter' | 'linkedin' | 'facebook'; 
      message?: string 
    }
  ): Promise<ApiResponse<{ shareUrl: string; content: string }>> {
    return this.post<{ shareUrl: string; content: string }>('/sharing/social-share', walletAddress, data);
  }

  static async sendEmail(
    walletAddress: string, 
    data: { 
      to: string; 
      subject: string; 
      template: 'receipt' | 'notification' | 'custom'; 
      data: Record<string, unknown> 
    }
  ): Promise<ApiResponse<{ messageId: string }>> {
    return this.post<{ messageId: string }>('/sharing/send-email', walletAddress, data);
  }
}
