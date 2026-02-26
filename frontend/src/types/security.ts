/**
 * Security Types
 * Shared type definitions for security analysis components
 */

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type VerdictType = 'SAFE' | 'CAUTION' | 'DANGER' | 'CRITICAL';

export interface VulnerabilityFlag {
  flag: string;
  weight: number;
  severity: SeverityLevel;
  description: string;
}

export interface AIAnalysis {
  explanation: string;
  recommendation: string;
  technicalSummary: string;
  verdict: VerdictType;
}

export interface RiskSummary {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
