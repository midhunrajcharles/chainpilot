import { BaseApiClient } from './base';
import { ApiResponse } from '@/types/api';

export interface AnomalyEvent {
  _id: string;
  walletAddress: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;
  riskScore: number;
  details: Record<string, any>;
  relatedTxHashes?: string[];
  relatedAddresses?: string[];
  acknowledged: boolean;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnomalyScanResult {
  walletAddress: string;
  scannedAt: string;
  overallRisk: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomalies: AnomalyEvent[];
  newAnomaliesFound: number;
}

export interface PreTxCheckResult {
  safe: boolean;
  riskLevel: string;
  flags: string[];
  details: Record<string, any>;
}

export class AnomalyApiClient extends BaseApiClient {
  static async scanWallet(walletAddress: string): Promise<ApiResponse<AnomalyScanResult>> {
    return this.post<AnomalyScanResult>('/anomaly/scan', walletAddress, { walletAddress });
  }

  static async getEvents(
    walletAddress: string,
    params?: { unread?: boolean; severity?: string; limit?: number }
  ): Promise<ApiResponse<AnomalyEvent[]>> {
    const qs = new URLSearchParams();
    qs.set('wallet', walletAddress);
    if (params?.unread !== undefined) qs.set('unread', String(params.unread));
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.limit) qs.set('limit', String(params.limit));
    return this.get<AnomalyEvent[]>(`/anomaly/events?${qs.toString()}`, walletAddress);
  }

  static async preTxCheck(
    walletAddress: string,
    data: { from: string; to: string; amount: string; token?: string }
  ): Promise<ApiResponse<PreTxCheckResult>> {
    return this.post<PreTxCheckResult>('/anomaly/pre-tx-check', walletAddress, data);
  }

  static async acknowledge(walletAddress: string, eventId: string): Promise<ApiResponse<{ acknowledged: boolean }>> {
    return this.post<{ acknowledged: boolean }>(`/anomaly/acknowledge/${eventId}`, walletAddress, {});
  }

  static async clearAcknowledged(walletAddress: string): Promise<ApiResponse<{ deleted: number }>> {
    return this.delete<{ deleted: number }>(`/anomaly/events`, walletAddress);
  }
}
