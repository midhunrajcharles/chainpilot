import { BaseApiClient } from './base';
import { User, ApiResponse } from '@/types/api';

export class UserApiClient extends BaseApiClient {
  static async createOrUpdateUser(
    walletAddress: string, 
    data: { name?: string; preferences?: Record<string, unknown> }
  ): Promise<ApiResponse<User>> {
    return this.post<User>('/user/profile', walletAddress, data);
  }

  static async getUserProfile(walletAddress: string): Promise<ApiResponse<User>> {
    return this.get<User>('/user/profile', walletAddress);
  }

  static async updateUserProfile(
    walletAddress: string, 
    data: { name?: string; preferences?: Record<string, unknown> }
  ): Promise<ApiResponse<User>> {
    return this.put<User>('/user/profile', walletAddress, data);
  }
}
