import { BaseApiClient } from './base';
import { RiskAssessment, AddressReputation, ScamDetection, TransactionValidation, ApiResponse } from '@/types/api';

export class SecurityApiClient extends BaseApiClient {
  static async assessRisk(
    walletAddress: string, 
    data: { address: string; amount: string; token: string }
  ): Promise<ApiResponse<RiskAssessment>> {
    return this.post<RiskAssessment>('/security/risk-assessment', walletAddress, data);
  }

  static async getAddressReputation(
    walletAddress: string, 
    address: string
  ): Promise<ApiResponse<AddressReputation>> {
    return this.get<AddressReputation>(`/security/address-reputation/${address}`, walletAddress);
  }

  static async detectScam(
    walletAddress: string, 
    data: { address: string; message?: string }
  ): Promise<ApiResponse<ScamDetection>> {
    return this.post<ScamDetection>('/security/scam-detection', walletAddress, data);
  }

  static async validateTransaction(
    walletAddress: string, 
    data: { from: string; to: string; amount: string; token: string; gasEstimate?: string }
  ): Promise<ApiResponse<TransactionValidation>> {
    return this.post<TransactionValidation>('/security/transaction-validation', walletAddress, data);
  }
}
