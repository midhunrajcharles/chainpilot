/**
 * Contract Analysis API Client
 * Frontend API calls for smart contract security analysis
 */

import axios from 'axios';
import { SeverityLevel, VerdictType, VulnerabilityFlag, AIAnalysis, RiskSummary } from '@/types/security';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface ContractAnalysisRequest {
  contractAddress: string;
  chainId?: number;
  userAddress: string;
}

export interface ContractAnalysisResponse {
  success: boolean;
  data?: {
    contractAddress: string;
    chainId: number;
    isVerified: boolean;
    riskScore: number;
    severity: SeverityLevel;
    summary: RiskSummary & {
      totalFlags: number;
    };
    findings: Array<{
      flag: string;
      severity: SeverityLevel;
      description: string;
      evidence: string;
      recommendation: string;
    }>;
    flagBreakdown: VulnerabilityFlag[];
    aiExplanation: AIAnalysis;
    auditLog: {
      reportHash: string;
      txHash?: string;
      explorerUrl?: string;
      isVerifiedOnChain: boolean;
    };
    analyzedAt: string;
  };
  error?: string;
}

export interface AuditHistory {
  audits: Array<{
    _id: string;
    contractAddress: string;
    riskScore: number;
    severity: SeverityLevel;
    createdAt: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

/**
 * Analyze a smart contract
 */
export async function analyzeContract(
  params: ContractAnalysisRequest
): Promise<ContractAnalysisResponse> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/contracts/analyze`,
      params,
      { timeout: 45000 }
    );
    return response.data;
  } catch (error: any) {
    console.error('Contract analysis API error:', error);
    const validationMessage = error.response?.data?.errors?.[0]?.msg;
    throw new Error(
      validationMessage ||
      error.response?.data?.error ||
      (error.code === 'ECONNABORTED' ? 'Contract analysis timed out. Please try again.' : '') ||
      'Failed to analyze contract'
    );
  }
}

/**
 * Get analysis history for a contract
 */
export async function getContractAnalysisHistory(
  address: string,
  limit: number = 10,
  skip: number = 0
): Promise<AuditHistory> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/contracts/${address}/history`,
      {
        params: { limit, skip },
      }
    );
    return response.data.data;
  } catch (error: any) {
    console.error('Audit history API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to fetch audit history'
    );
  }
}

/**
 * Get aggregate statistics
 */
export async function getContractStats(): Promise<{
  totalAudits: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recentAudits: Array<any>;
}> {
  try {
    const response = await axios.get(`${API_BASE_URL}/contracts/stats`);
    return response.data.data;
  } catch (error: any) {
    console.error('Contract stats API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to fetch contract stats'
    );
  }
}

export default {
  analyzeContract,
  getContractAnalysisHistory,
  getContractStats,
};
