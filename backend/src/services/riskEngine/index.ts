/**
 * Risk Engine Service
 * Orchestrates risk scoring and report generation
 */

import { ContractAnalysisResult, RiskFinding, RiskSeverity } from '../contractAnalyzer/types';
import { VULNERABILITY_WEIGHTS, getSeverityFromScore } from './weights';

export interface RiskReport {
  contractAddress: string;
  riskScore: number;
  severity: RiskSeverity;
  findings: RiskFinding[];
  flagBreakdown: FlagBreakdown[];
  summary: {
    totalFlags: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  timestamp: Date;
}

export interface FlagBreakdown {
  flag: string;
  weight: number;
  severity: RiskSeverity;
  description: string;
}

/**
 * Calculate risk score from findings
 */
export function calculateRiskScore(findings: RiskFinding[]): number {
  if (!findings || findings.length === 0) return 0;
  
  let totalScore = 0;
  const flagsDetected = new Set<string>();
  
  for (const finding of findings) {
    // Avoid counting duplicate flags
    if (flagsDetected.has(finding.flag)) continue;
    
    const weight = VULNERABILITY_WEIGHTS[finding.flag] || 0;
    totalScore += weight;
    flagsDetected.add(finding.flag);
  }
  
  // Cap at 100
  return Math.min(totalScore, 100);
}

/**
 * Generate flag breakdown for UI display
 */
export function generateFlagBreakdown(findings: RiskFinding[]): FlagBreakdown[] {
  const breakdown: FlagBreakdown[] = [];
  const seenFlags = new Set<string>();
  
  for (const finding of findings) {
    if (seenFlags.has(finding.flag)) continue;
    
    breakdown.push({
      flag: finding.flag,
      weight: VULNERABILITY_WEIGHTS[finding.flag] || 0,
      severity: finding.severity,
      description: finding.description,
    });
    
    seenFlags.add(finding.flag);
  }
  
  // Sort by weight descending
  breakdown.sort((a, b) => b.weight - a.weight);
  
  return breakdown;
}

/**
 * Generate summary statistics
 */
export function generateSummary(findings: RiskFinding[]) {
  const summary = {
    totalFlags: findings.length,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
  };
  
  for (const finding of findings) {
    switch (finding.severity) {
      case RiskSeverity.CRITICAL:
        summary.criticalCount++;
        break;
      case RiskSeverity.HIGH:
        summary.highCount++;
        break;
      case RiskSeverity.MEDIUM:
        summary.mediumCount++;
        break;
      case RiskSeverity.LOW:
        summary.lowCount++;
        break;
    }
  }
  
  return summary;
}

/**
 * Generate complete risk report
 */
export function generateRiskReport(
  analysisResult: ContractAnalysisResult
): RiskReport {
  const riskScore = calculateRiskScore(analysisResult.findings);
  const severity = getSeverityFromScore(riskScore) as RiskSeverity;
  const flagBreakdown = generateFlagBreakdown(analysisResult.findings);
  const summary = generateSummary(analysisResult.findings);
  
  // Update analysis result with calculated values
  analysisResult.riskScore = riskScore;
  analysisResult.severity = severity;
  
  return {
    contractAddress: analysisResult.contractAddress,
    riskScore,
    severity,
    findings: analysisResult.findings,
    flagBreakdown,
    summary,
    timestamp: new Date(),
  };
}

/**
 * Aggregate findings from multiple sources
 */
export function aggregateFindings(
  contractAnalysis: ContractAnalysisResult,
  simulationFindings?: RiskFinding[]
): RiskFinding[] {
  const allFindings = [...contractAnalysis.findings];
  
  if (simulationFindings && simulationFindings.length > 0) {
    allFindings.push(...simulationFindings);
  }
  
  // Remove duplicates based on flag
  const uniqueFindings = allFindings.filter(
    (finding, index, self) =>
      index === self.findIndex((f) => f.flag === finding.flag)
  );
  
  return uniqueFindings;
}

/**
 * Compare risk between two analyses
 */
export function compareRisk(
  oldAnalysis: RiskReport,
  newAnalysis: RiskReport
): {
  scoreChange: number;
  severityChanged: boolean;
  newFlags: string[];
  resolvedFlags: string[];
} {
  const scoreChange = newAnalysis.riskScore - oldAnalysis.riskScore;
  const severityChanged = oldAnalysis.severity !== newAnalysis.severity;
  
  const oldFlags = new Set(oldAnalysis.findings.map((f) => f.flag));
  const newFlags = new Set(newAnalysis.findings.map((f) => f.flag));
  
  const newFlagsArray = Array.from(newFlags).filter((f) => !oldFlags.has(f));
  const resolvedFlagsArray = Array.from(oldFlags).filter((f) => !newFlags.has(f));
  
  return {
    scoreChange,
    severityChanged,
    newFlags: newFlagsArray,
    resolvedFlags: resolvedFlagsArray,
  };
}
