/**
 * Audit Log API Client
 * Frontend API calls for audit log records
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface AuditLogEntry {
  _id: string;
  reportHash: string;
  contractAddress: string;
  chainId: number;
  riskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findingsCount: number;
  findings: Array<{
    flag: string;
    severity: string;
    description: string;
  }>;
  aiVerdict: 'SAFE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  txHash?: string;
  blockNumber?: number;
  initiator: string;
  isVerifiedOnChain: boolean;
  analyzedAt: string;
  createdAt: string;
  explorerUrl?: string;
}

/**
 * Get recent audit logs
 */
export async function getRecentAudits(
  limit: number = 50,
  skip: number = 0,
  severity?: string
): Promise<{
  audits: AuditLogEntry[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}> {
  try {
    const response = await axios.get(`${API_BASE_URL}/audits/recent`, {
      params: { limit, skip, severity },
    });
    return response.data.data;
  } catch (error: any) {
    console.error('Get recent audits API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to fetch recent audits'
    );
  }
}

/**
 * Verify audit log on blockchain
 */
export async function verifyAuditLog(hash: string): Promise<{
  reportHash: string;
  existsInDatabase: boolean;
  databaseEntry: AuditLogEntry;
  onChainVerification: {
    exists: boolean;
    message?: string;
    entry?: any;
  };
}> {
  try {
    const response = await axios.get(`${API_BASE_URL}/audits/verify/${hash}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Verify audit API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to verify audit log'
    );
  }
}

/**
 * Get platform-wide audit statistics
 */
export async function getAuditStats(): Promise<{
  totalAudits: number;
  verifiedOnChain: number;
  auditsToday: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  topRiskyContracts: Array<{
    _id: string;
    latestRiskScore: number;
    latestSeverity: string;
    auditCount: number;
    lastAudit: string;
  }>;
}> {
  try {
    const response = await axios.get(`${API_BASE_URL}/audits/stats`);
    return response.data.data;
  } catch (error: any) {
    console.error('Get audit stats API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to fetch audit stats'
    );
  }
}

/**
 * Get all audits for a specific contract
 */
export async function getContractAudits(address: string): Promise<{
  contractAddress: string;
  totalAudits: number;
  latestAudit: AuditLogEntry;
  audits: AuditLogEntry[];
  riskTrend: Array<{
    date: string;
    riskScore: number;
    severity: string;
  }>;
}> {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/audits/contract/${address}`
    );
    return response.data.data;
  } catch (error: any) {
    console.error('Get contract audits API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to fetch contract audits'
    );
  }
}

/**
 * Get detailed audit by ID
 */
export async function getAuditById(id: string): Promise<AuditLogEntry> {
  try {
    const response = await axios.get(`${API_BASE_URL}/audits/${id}`);
    return response.data.data;
  } catch (error: any) {
    console.error('Get audit by ID API error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to fetch audit details'
    );
  }
}

export default {
  getRecentAudits,
  verifyAuditLog,
  getAuditStats,
  getContractAudits,
  getAuditById,
};
