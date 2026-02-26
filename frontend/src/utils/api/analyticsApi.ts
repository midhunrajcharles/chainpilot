import { AnalyticsData, ApiResponse, PortfolioData, PredictionData, SpendingPattern, TransactionHistoryParams } from '@/types/api';
import { BaseApiClient } from './base';

export class AnalyticsApiClient extends BaseApiClient {
  static async getAnalyticsDashboard(
    walletAddress: string, 
    period: string = "30d"
  ): Promise<ApiResponse<AnalyticsData>> {
    return this.get<AnalyticsData>('/analytics/dashboard', walletAddress, { period });
  }

  static async getSpendingPatterns(
    walletAddress: string, 
    period: string = "30d", 
    groupBy: string = "day"
  ): Promise<ApiResponse<SpendingPattern[]>> {
    return this.get<SpendingPattern[]>('/analytics/spending-patterns', walletAddress, { period, groupBy });
  }

  static async getPortfolioTracking(walletAddress: string): Promise<ApiResponse<PortfolioData>> {
    return this.get<PortfolioData>('/analytics/portfolio-tracking', walletAddress);
  }

  static async getTransactionHistory(
    walletAddress: string, 
    params?: TransactionHistoryParams
  ): Promise<ApiResponse<unknown>> {
    return this.get<unknown>('/analytics/transaction-history', walletAddress, params as Record<string, string | number | boolean | undefined>);
  }

  static async getPredictions(walletAddress: string): Promise<ApiResponse<PredictionData>> {
    return this.get<PredictionData>('/analytics/predictions', walletAddress);
  }
}
