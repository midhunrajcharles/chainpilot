/**
 * Risk Scoring Weights
 * Based on real-world attack frequency and severity
 */

import { VulnerabilityFlag } from '../contractAnalyzer/types';

export const VULNERABILITY_WEIGHTS: Record<VulnerabilityFlag, number> = {
  [VulnerabilityFlag.REENTRANCY_PATTERN]: 25,
  [VulnerabilityFlag.SELFDESTRUCT_PRESENT]: 20,
  [VulnerabilityFlag.PRICE_MANIPULATION_RISK]: 22,
  [VulnerabilityFlag.UNLIMITED_APPROVAL]: 18,
  [VulnerabilityFlag.MISSING_ACCESS_CONTROL]: 16,
  [VulnerabilityFlag.OWNER_ONLY_WITHDRAW]: 15,
  [VulnerabilityFlag.SUSPICIOUS_MODIFIER]: 14,
  [VulnerabilityFlag.CENTRALIZED_CONTROL]: 13,
  [VulnerabilityFlag.PROXY_CONTRACT]: 12,
  [VulnerabilityFlag.UNVERIFIED_SOURCE]: 10,
  [VulnerabilityFlag.DELEGATECALL_USAGE]: 17,
  [VulnerabilityFlag.UNCHECKED_EXTERNAL_CALL]: 16,
  [VulnerabilityFlag.TIMESTAMP_DEPENDENCY]: 8,
  [VulnerabilityFlag.TX_ORIGIN_USAGE]: 19,
  [VulnerabilityFlag.FLASH_LOAN_VULNERABILITY]: 24,
};

export const SEVERITY_THRESHOLDS = {
  CRITICAL: 70,
  HIGH: 45,
  MEDIUM: 20,
  LOW: 0,
};

export function getSeverityFromScore(score: number): string {
  if (score >= SEVERITY_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (score >= SEVERITY_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= SEVERITY_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}
