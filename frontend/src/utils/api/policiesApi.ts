import { BaseApiClient } from './base';
import { ApiResponse } from '@/types/api';

export interface PolicyRule {
  type: 'MAX_TRANSACTION_VALUE' | 'WHITELIST_ONLY' | 'DAILY_SPEND_LIMIT' | 'REQUIRE_COOL_DOWN' | 'BLOCK_UNVERIFIED_CONTRACTS' | 'ALERT_NEW_ADDRESS' | 'CUSTOM_ANOMALY_THRESHOLD';
  enabled: boolean;
  params: Record<string, any>;
  action: 'ALERT' | 'BLOCK';
  notifyVia?: string[];
}

export interface SecurityPolicy {
  _id: string;
  walletAddress: string;
  name: string;
  description?: string;
  enabled: boolean;
  rules: PolicyRule[];
  whitelistedAddresses?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PolicyEvalResult {
  allowed: boolean;
  violations: Array<{ rule: PolicyRule; reason: string }>;
  warnings: Array<{ rule: PolicyRule; reason: string }>;
}

export class PoliciesApiClient extends BaseApiClient {
  static async list(walletAddress: string): Promise<ApiResponse<SecurityPolicy[]>> {
    return this.get<SecurityPolicy[]>(`/policies?wallet=${walletAddress}`, walletAddress);
  }

  static async create(
    walletAddress: string,
    data: Omit<SecurityPolicy, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<SecurityPolicy>> {
    return this.post<SecurityPolicy>('/policies', walletAddress, data as Record<string, unknown>);
  }

  static async update(
    walletAddress: string,
    id: string,
    data: Partial<SecurityPolicy>
  ): Promise<ApiResponse<SecurityPolicy>> {
    return this.put<SecurityPolicy>(`/policies/${id}`, walletAddress, data as Record<string, unknown>);
  }

  static async toggle(walletAddress: string, id: string, enabled: boolean): Promise<ApiResponse<SecurityPolicy>> {
    return this.put<SecurityPolicy>(`/policies/${id}`, walletAddress, { enabled });
  }

  static async remove(walletAddress: string, id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.delete<{ deleted: boolean }>(`/policies/${id}`, walletAddress);
  }

  static async evaluate(
    walletAddress: string,
    tx: { from: string; to: string; amount: string; token?: string }
  ): Promise<ApiResponse<PolicyEvalResult>> {
    return this.post<PolicyEvalResult>('/policies/evaluate', walletAddress, { walletAddress, ...tx });
  }
}
