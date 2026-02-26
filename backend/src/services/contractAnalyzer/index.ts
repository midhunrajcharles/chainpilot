/**
 * Contract Analyzer Service
 * Fetches and analyzes smart contracts for security vulnerabilities
 */

import { ethers } from 'ethers';
import axios from 'axios';
import {
  ContractAnalysisResult,
  ContractFetchResult,
  RiskFinding,
  VulnerabilityFlag,
  RiskSeverity,
  BytecodeAnalysisResult,
  SourceCodeAnalysisResult,
  ABIAnalysisResult,
} from './types';
import {
  detectBytecodePatterns,
  detectSourcePatterns,
  detectRiskyFunctions,
} from './patterns';

/**
 * Fetch contract bytecode from blockchain
 */
export async function fetchContractBytecode(
  address: string,
  rpcUrl: string
): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const bytecode = await provider.getCode(address);
    
    if (bytecode === '0x' || bytecode === '0x0') {
      throw new Error('No contract found at this address');
    }
    
    return bytecode;
  } catch (error: any) {
    throw new Error(`Failed to fetch bytecode: ${error.message}`);
  }
}

/**
 * Fetch contract source code from block explorer (if verified)
 * Note: This requires block explorer API integration
 */
export async function fetchContractSource(
  address: string,
  chainId: number,
  explorerApiKey?: string
): Promise<ContractFetchResult> {
  const bytecode = await fetchContractBytecode(
    address,
    getDefaultRpcUrl(chainId)
  );
  
  // For now, return unverified result
  // In production, integrate with Etherscan/Blockscout API
  return {
    address,
    bytecode,
    isVerified: false,
  };
}

/**
 * Analyze bytecode for vulnerability patterns
 */
export function analyzeBytecode(bytecode: string): BytecodeAnalysisResult {
  const patterns = detectBytecodePatterns(bytecode);
  
  // Count opcodes
  const cleanBytecode = bytecode.replace(/^0x/, '');
  const opcodeCounts: Record<string, number> = {};
  
  // Basic opcode counting (pairs of hex chars)
  for (let i = 0; i < cleanBytecode.length; i += 2) {
    const opcode = cleanBytecode.substring(i, i + 2);
    opcodeCounts[opcode] = (opcodeCounts[opcode] || 0) + 1;
  }
  
  return {
    hasSelfdestruct: patterns.SELFDESTRUCT.matched,
    hasDelegatecall: patterns.DELEGATECALL.matched || patterns.CALLCODE.matched,
    hasReentrancyPattern: patterns.CALL_SLOAD.matched,
    hasUncheckedExternalCall: patterns.CALL_SLOAD.matched,
    hasTxOrigin: patterns.TX_ORIGIN.matched,
    opcodeCounts,
  };
}

/**
 * Analyze source code for vulnerability patterns
 */
export function analyzeSourceCode(sourceCode: string): SourceCodeAnalysisResult {
  const patterns = detectSourcePatterns(sourceCode);
  
  return {
    hasTimestampDependency: patterns.TIMESTAMP_DEPENDENCY.matched,
    hasOwnerOnlyWithdraw: patterns.OWNER_WITHDRAW.matched,
    hasMissingAccessControl: patterns.MISSING_MODIFIER.matched,
    hasSuspiciousModifier: patterns.SUSPICIOUS_MODIFIER.matched,
    hasUnlimitedApproval: patterns.UNLIMITED_APPROVAL.matched,
    hasPriceManipulationRisk: patterns.PRICE_ORACLE.matched,
    hasFlashLoanVulnerability: patterns.FLASH_LOAN.matched,
  };
}

/**
 * Analyze ABI for risky function signatures
 */
export function analyzeABI(abi: any[]): ABIAnalysisResult {
  const riskyFunctions = detectRiskyFunctions(abi);
  
  const functionNames = abi
    .filter((item) => item.type === 'function')
    .map((item) => item.name?.toLowerCase() || '');
  
  return {
    hasWithdrawFunction: functionNames.some((name) =>
      name.includes('withdraw')
    ),
    hasOwnerOnlyFunctions: functionNames.some(
      (name) => name.includes('owner') || name.includes('admin')
    ),
    hasUpgradeFunction: functionNames.some(
      (name) => name.includes('upgrade') || name.includes('implementation')
    ),
    hasPauseFunction: functionNames.some((name) => name.includes('pause')),
    dangerousFunctions: riskyFunctions,
  };
}

/**
 * Generate findings from analysis results
 */
export function generateFindings(
  bytecodeAnalysis: BytecodeAnalysisResult,
  sourceCodeAnalysis?: SourceCodeAnalysisResult,
  abiAnalysis?: ABIAnalysisResult
): RiskFinding[] {
  const findings: RiskFinding[] = [];
  
  // Bytecode-based findings
  if (bytecodeAnalysis.hasReentrancyPattern) {
    findings.push({
      flag: VulnerabilityFlag.REENTRANCY_PATTERN,
      severity: RiskSeverity.CRITICAL,
      description: 'Contract contains potential reentrancy vulnerability',
      evidence: 'External call followed by state change detected in bytecode',
      recommendation: 'Use checks-effects-interactions pattern or reentrancy guards',
    });
  }
  
  if (bytecodeAnalysis.hasSelfdestruct) {
    findings.push({
      flag: VulnerabilityFlag.SELFDESTRUCT_PRESENT,
      severity: RiskSeverity.HIGH,
      description: 'Contract contains selfdestruct functionality',
      evidence: 'SELFDESTRUCT opcode (0xff) detected',
      recommendation: 'Verify selfdestruct is properly access-controlled',
    });
  }
  
  if (bytecodeAnalysis.hasDelegatecall) {
    findings.push({
      flag: VulnerabilityFlag.DELEGATECALL_USAGE,
      severity: RiskSeverity.HIGH,
      description: 'Contract uses delegatecall which can be dangerous',
      evidence: 'DELEGATECALL opcode (0xf4) detected',
      recommendation: 'Ensure delegatecall target is trusted and immutable',
    });
  }
  
  if (bytecodeAnalysis.hasTxOrigin) {
    findings.push({
      flag: VulnerabilityFlag.TX_ORIGIN_USAGE,
      severity: RiskSeverity.HIGH,
      description: 'Contract uses tx.origin for authentication',
      evidence: 'TX.ORIGIN opcode (0x32) detected',
      recommendation: 'Use msg.sender instead of tx.origin for authentication',
    });
  }
  
  if (bytecodeAnalysis.hasUncheckedExternalCall) {
    findings.push({
      flag: VulnerabilityFlag.UNCHECKED_EXTERNAL_CALL,
      severity: RiskSeverity.MEDIUM,
      description: 'Contract may have unchecked external calls',
      evidence: 'External call pattern detected without apparent checks',
      recommendation: 'Always check return values of external calls',
    });
  }
  
  // Source code-based findings
  if (sourceCodeAnalysis) {
    if (sourceCodeAnalysis.hasTimestampDependency) {
      findings.push({
        flag: VulnerabilityFlag.TIMESTAMP_DEPENDENCY,
        severity: RiskSeverity.LOW,
        description: 'Contract logic depends on block.timestamp',
        evidence: 'block.timestamp usage detected',
        recommendation: 'Avoid using block.timestamp for critical logic',
      });
    }
    
    if (sourceCodeAnalysis.hasOwnerOnlyWithdraw) {
      findings.push({
        flag: VulnerabilityFlag.OWNER_ONLY_WITHDRAW,
        severity: RiskSeverity.MEDIUM,
        description: 'Contract has owner-controlled withdraw function',
        evidence: 'onlyOwner withdraw function detected',
        recommendation: 'Verify withdrawal mechanism is fair and transparent',
      });
    }
    
    if (sourceCodeAnalysis.hasMissingAccessControl) {
      findings.push({
        flag: VulnerabilityFlag.MISSING_ACCESS_CONTROL,
        severity: RiskSeverity.HIGH,
        description: 'Critical functions may lack access control',
        evidence: 'Public/external functions without modifiers detected',
        recommendation: 'Add proper access control modifiers to sensitive functions',
      });
    }
    
    if (sourceCodeAnalysis.hasSuspiciousModifier) {
      findings.push({
        flag: VulnerabilityFlag.SUSPICIOUS_MODIFIER,
        severity: RiskSeverity.MEDIUM,
        description: 'Contract contains privileged access modifiers',
        evidence: 'Admin/owner modifiers detected',
        recommendation: 'Review all privileged functions for potential abuse',
      });
    }
    
    if (sourceCodeAnalysis.hasUnlimitedApproval) {
      findings.push({
        flag: VulnerabilityFlag.UNLIMITED_APPROVAL,
        severity: RiskSeverity.MEDIUM,
        description: 'Contract may request unlimited token approvals',
        evidence: 'Unlimited approval pattern detected',
        recommendation: 'Request only necessary token allowances',
      });
    }
    
    if (sourceCodeAnalysis.hasPriceManipulationRisk) {
      findings.push({
        flag: VulnerabilityFlag.PRICE_MANIPULATION_RISK,
        severity: RiskSeverity.CRITICAL,
        description: 'Contract may be vulnerable to price manipulation',
        evidence: 'Oracle or price feed usage detected',
        recommendation: 'Use secure price oracles with TWAP or multiple sources',
      });
    }
    
    if (sourceCodeAnalysis.hasFlashLoanVulnerability) {
      findings.push({
        flag: VulnerabilityFlag.FLASH_LOAN_VULNERABILITY,
        severity: RiskSeverity.CRITICAL,
        description: 'Contract may be vulnerable to flash loan attacks',
        evidence: 'Flash loan pattern detected',
        recommendation: 'Implement flash loan protection mechanisms',
      });
    }
  }
  
  // ABI-based findings
  if (abiAnalysis) {
    if (abiAnalysis.hasUpgradeFunction) {
      findings.push({
        flag: VulnerabilityFlag.PROXY_CONTRACT,
        severity: RiskSeverity.MEDIUM,
        description: 'Contract appears to be upgradeable',
        evidence: 'Upgrade function detected in ABI',
        recommendation: 'Verify upgrade mechanism is properly secured',
      });
    }
    
    if (abiAnalysis.dangerousFunctions.length > 3) {
      findings.push({
        flag: VulnerabilityFlag.CENTRALIZED_CONTROL,
        severity: RiskSeverity.MEDIUM,
        description: 'Contract has multiple privileged functions',
        evidence: `${abiAnalysis.dangerousFunctions.length} privileged functions detected`,
        recommendation: 'Consider decentralizing control or using timelock',
      });
    }
  }
  
  return findings;
}

/**
 * Main contract analysis function
 */
export async function analyzeContract(
  address: string,
  chainId: number = 11155111, // Sepolia testnet default
  explorerApiKey?: string
): Promise<ContractAnalysisResult> {
  try {
    // Validate address
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid contract address');
    }

    // Fetch contract data
    const contractData = await fetchContractSource(
      address,
      chainId,
      explorerApiKey
    );
    
    // Analyze bytecode
    const bytecodeAnalysis = analyzeBytecode(contractData.bytecode);
    
    // Analyze source code if available
    let sourceCodeAnalysis: SourceCodeAnalysisResult | undefined;
    if (contractData.sourceCode) {
      sourceCodeAnalysis = analyzeSourceCode(contractData.sourceCode);
    }
    
    // Analyze ABI if available
    let abiAnalysis: ABIAnalysisResult | undefined;
    if (contractData.abi) {
      abiAnalysis = analyzeABI(contractData.abi);
    }
    
    // Generate findings
    const findings = generateFindings(
      bytecodeAnalysis,
      sourceCodeAnalysis,
      abiAnalysis
    );
    
    // Add unverified source finding if applicable
    if (!contractData.isVerified) {
      findings.push({
        flag: VulnerabilityFlag.UNVERIFIED_SOURCE,
        severity: RiskSeverity.LOW,
        description: 'Contract source code is not verified',
        evidence: 'No verified source code available on block explorer',
        recommendation: 'Exercise caution with unverified contracts',
      });
    }
    
    // Calculate bytecode hash for audit logging
    const bytecodeHash = ethers.keccak256(contractData.bytecode);
    
    return {
      contractAddress: address,
      chainId,
      isVerified: contractData.isVerified,
      bytecodeHash,
      findings,
      riskScore: 0, // Will be calculated by risk engine
      severity: RiskSeverity.LOW, // Will be determined by risk engine
      bytecodeAnalysis,
      sourceCodeAnalysis,
      abiAnalysis,
      analyzedAt: new Date(),
    };
  } catch (error: any) {
    throw new Error(`Contract analysis failed: ${error.message}`);
  }
}

/**
 * Get default RPC URL for chain
 */
function getDefaultRpcUrl(chainId: number): string {
  const RPC_URLS: Record<number, string> = {
    11155111: process.env.SOMNIA_RPC_URL || 'https://rpc.sepolia.org',
    1: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    137: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  };
  
  return RPC_URLS[chainId] || RPC_URLS[11155111];
}
