import { BaseApiClient } from './base';
import { Transaction, ApiResponse, TransactionHistoryParams } from '@/types/api';

export class TransactionApiClient extends BaseApiClient {
  // Transaction History
  static async getTransactionHistory(
    walletAddress: string, 
    params?: TransactionHistoryParams
  ): Promise<ApiResponse<Transaction[]>> {
    return this.get<Transaction[]>('/analytics/transaction-history', walletAddress, params as Record<string, string | number | boolean | undefined>);
  }

  // Scheduled Transactions
  static async getScheduledTransactions(walletAddress: string): Promise<ApiResponse<Transaction[]>> {
    return this.get<Transaction[]>('/transactions/scheduled', walletAddress);
  }

  static async createScheduledTransaction(
    walletAddress: string, 
    data: { 
      amount: string; 
      token: string; 
      recipient: string; 
      scheduledFor: string; 
      recurring?: { frequency: string; endDate?: string } 
    }
  ): Promise<ApiResponse<Transaction>> {
    return this.post<Transaction>('/transactions/scheduled', walletAddress, data);
  }

  static async updateScheduledTransaction(
    walletAddress: string, 
    transactionId: string, 
    data: { 
      scheduledFor?: string; 
      recurring?: { frequency: string; endDate?: string } 
    }
  ): Promise<ApiResponse<Transaction>> {
    return this.put<Transaction>(`/transactions/scheduled/${transactionId}`, walletAddress, data);
  }

  static async deleteScheduledTransaction(
    walletAddress: string, 
    transactionId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/transactions/scheduled/${transactionId}`, walletAddress);
  }

  // Conditional Transactions
  static async getConditionalTransactions(walletAddress: string): Promise<ApiResponse<Transaction[]>> {
    return this.get<Transaction[]>('/transactions/conditional', walletAddress);
  }

  static async createConditionalTransaction(
    walletAddress: string, 
    data: { 
      amount: string; 
      token: string; 
      recipient: string; 
      condition: { 
        type: 'price' | 'time' | 'balance'; 
        operator: '>' | '<' | '>=' | '<=' | '=='; 
        value: string; 
        token?: string 
      } 
    }
  ): Promise<ApiResponse<Transaction>> {
    return this.post<Transaction>('/transactions/conditional', walletAddress, data);
  }

  static async deleteConditionalTransaction(
    walletAddress: string, 
    transactionId: string
  ): Promise<ApiResponse<void>> {
    return this.delete<void>(`/transactions/conditional/${transactionId}`, walletAddress);
  }
}
