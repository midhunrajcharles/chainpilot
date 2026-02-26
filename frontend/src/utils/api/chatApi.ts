import { ApiResponse, Contact, Team, Transaction } from '@/types/api';
import { BaseApiClient } from './base';

export class ChatApiClient extends BaseApiClient {
  // Record transaction executed via chat
  static async recordTransaction(
    walletAddress: string,
    data: {
      from: string;
      to: string;
      amount: string;
      token: string;
      txHash: string;
      gasUsed?: string;
      status?: 'pending' | 'confirmed' | 'failed';
    }
  ): Promise<ApiResponse<Transaction>> {
    return this.post<Transaction>('/chat/record-transaction', walletAddress, data);
  }

  // Create contact via chat
  static async createContact(
    walletAddress: string,
    data: {
      name: string;
      address: string;
      group?: string;
    }
  ): Promise<ApiResponse<Contact>> {
    return this.post<Contact>('/chat/create-contact', walletAddress, data);
  }

  // Create team via chat
  static async createTeam(
    walletAddress: string,
    data: {
      name: string;
      description?: string;
      members?: Array<{ walletAddress: string; name: string }>;
    }
  ): Promise<ApiResponse<Team>> {
    return this.post<Team>('/chat/create-team', walletAddress, data);
  }

  // Get contacts for chat suggestions
  static async getContacts(walletAddress: string): Promise<ApiResponse<Contact[]>> {
    return this.get<Contact[]>('/chat/contacts', walletAddress);
  }

  // Get teams for chat suggestions
  static async getTeams(walletAddress: string): Promise<ApiResponse<Team[]>> {
    return this.get<Team[]>('/chat/teams', walletAddress);
  }

  // Log chat activity
  static async logActivity(
    walletAddress: string,
    data: {
      action: 'message_sent' | 'message_received' | 'transaction_initiated' | 'transaction_confirmed' | 'contact_created' | 'team_created' | 'analytics_requested' | 'balance_checked';
      sessionId: string;
      message?: string;
      intent?: any;
      result?: any;
    }
  ): Promise<ApiResponse<void>> {
    return this.post<void>('/chat/log-activity', walletAddress, data);
  }
}
