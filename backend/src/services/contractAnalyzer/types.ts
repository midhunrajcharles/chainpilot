/**
 * Contract Analyzer Types
 * Defines interfaces for vulnerability detection and risk analysis
 */

export enum VulnerabilityFlag {
  REENTRANCY_PATTERN = 'REENTRANCY_PATTERN',
  SELFDESTRUCT_PRESENT = 'SELFDESTRUCT_PRESENT',
  DELEGATECALL_USAGE = 'DELEGATECALL_USAGE',
  PRICE_MANIPULATION_RISK = 'PRICE_MANIPULATION_RISK',
  UNLIMITED_APPROVAL = 'UNLIMITED_APPROVAL',
  MISSING_ACCESS_CONTROL = 'MISSING_ACCESS_CONTROL',
  OWNER_ONLY_WITHDRAW = 'OWNER_ONLY_WITHDRAW',
  SUSPICIOUS_MODIFIER = 'SUSPICIOUS_MODIFIER',
  CENTRALIZED_CONTROL = 'CENTRALIZED_CONTROL',
  PROXY_CONTRACT = 'PROXY_CONTRACT',
  UNVERIFIED_SOURCE = 'UNVERIFIED_SOURCE',
  UNCHECKED_EXTERNAL_CALL = 'UNCHECKED_EXTERNAL_CALL',
  TIMESTAMP_DEPENDENCY = 'TIMESTAMP_DEPENDENCY',
  TX_ORIGIN_USAGE = 'TX_ORIGIN_USAGE',
  FLASH_LOAN_VULNERABILITY = 'FLASH_LOAN_VULNERABILITY',
}

export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface RiskFinding {
  flag: VulnerabilityFlag;
  severity: RiskSeverity;
  description: string;
  evidence: string;
  location?: string;
  recommendation: string;
}

export interface BytecodeAnalysisResult {
  hasSelfdestruct: boolean;
  hasDelegatecall: boolean;
  hasReentrancyPattern: boolean;
  hasUncheckedExternalCall: boolean;
  hasTxOrigin: boolean;
  opcodeCounts: Record<string, number>;
}

export interface SourceCodeAnalysisResult {
  hasTimestampDependency: boolean;
  hasOwnerOnlyWithdraw: boolean;
  hasMissingAccessControl: boolean;
  hasSuspiciousModifier: boolean;
  hasUnlimitedApproval: boolean;
  hasPriceManipulationRisk: boolean;
  hasFlashLoanVulnerability: boolean;
}

export interface ABIAnalysisResult {
  hasWithdrawFunction: boolean;
  hasOwnerOnlyFunctions: boolean;
  hasUpgradeFunction: boolean;
  hasPauseFunction: boolean;
  dangerousFunctions: string[];
}

export interface ContractAnalysisResult {
  contractAddress: string;
  chainId: number;
  isVerified: boolean;
  bytecodeHash: string;
  findings: RiskFinding[];
  riskScore: number;
  severity: RiskSeverity;
  bytecodeAnalysis: BytecodeAnalysisResult;
  sourceCodeAnalysis?: SourceCodeAnalysisResult;
  abiAnalysis?: ABIAnalysisResult;
  analyzedAt: Date;
}

export interface ContractFetchResult {
  address: string;
  bytecode: string;
  sourceCode?: string;
  abi?: any[];
  isVerified: boolean;
  contractName?: string;
}
