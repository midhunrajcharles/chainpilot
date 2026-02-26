/**
 * Transaction Simulator Service
 * Simulates transactions before execution to detect risks
 */

import { ethers } from 'ethers';
import { RiskFinding, VulnerabilityFlag, RiskSeverity } from '../contractAnalyzer/types';

export interface SimulationResult {
  success: boolean;
  gasEstimate: number;
  gasUsed?: number;
  error?: string;
  warnings: string[];
  assetImpact: AssetImpact;
  drainRisk: DrainRiskAssessment;
  abnormalBehavior: string[];
}

export interface AssetImpact {
  tokenTransfers: TokenTransfer[];
  nativeValueChange: string;
  approvalChanges: ApprovalChange[];
}

export interface TokenTransfer {
  token: string;
  from: string;
  to: string;
  amount: string;
  symbol?: string;
}

export interface ApprovalChange {
  token: string;
  spender: string;
  amount: string;
  isUnlimited: boolean;
}

export interface DrainRiskAssessment {
  isDrainRisk: boolean;
  percentageAtRisk: number;
  details: string;
}

export interface TransactionParams {
  from: string;
  to: string;
  value?: string;
  data?: string;
  chainId: number;
}

/**
 * Simulate transaction using eth_call
 */
export async function simulateTransaction(
  params: TransactionParams,
  rpcUrl: string
): Promise<SimulationResult> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const warnings: string[] = [];
    const abnormalBehavior: string[] = [];
    
    // Build transaction object
    const tx: any = {
      from: params.from,
      to: params.to,
      value: params.value || '0x0',
      data: params.data || '0x',
    };
    
    // Estimate gas with safety buffer
    let gasEstimate = 0;
    try {
      const rawEstimate = await provider.estimateGas(tx);
      gasEstimate = Number(rawEstimate) * 1.2; // 20% buffer
    } catch (error: any) {
      warnings.push('Gas estimation failed - transaction may revert');
      gasEstimate = 300000; // Fallback estimate
    }
    
    // Simulate with eth_call
    let callResult;
    let success = true;
    try {
      callResult = await provider.call(tx);
    } catch (error: any) {
      success = false;
      warnings.push(`Transaction would revert: ${error.message}`);
    }
    
    // Get current balance for drain risk assessment
    const balance = await provider.getBalance(params.from);
    const drainRisk = assessDrainRisk(
      balance.toString(),
      params.value || '0',
      gasEstimate
    );
    
    if (drainRisk.isDrainRisk) {
      warnings.push(
        `WARNING: This transaction would use ${drainRisk.percentageAtRisk}% of your wallet balance!`
      );
    }
    
    // Check for abnormal data patterns
    if (params.data && params.data !== '0x') {
      const dataAnalysis = analyzeTransactionData(params.data);
      abnormalBehavior.push(...dataAnalysis.warnings);
    }
    
    // Detect token transfers (simplified - would need event log parsing in production)
    const assetImpact = await analyzeAssetImpact(
      params,
      provider,
      callResult
    );
    
    // Check for unlimited approvals
    if (params.data) {
      const approvalCheck = checkUnlimitedApproval(params.data);
      if (approvalCheck.isUnlimited) {
        warnings.push(
          'WARNING: This transaction grants unlimited token approval!'
        );
        abnormalBehavior.push('Unlimited approval detected');
      }
    }
    
    return {
      success,
      gasEstimate: Math.ceil(gasEstimate),
      warnings,
      assetImpact,
      drainRisk,
      abnormalBehavior,
    };
  } catch (error: any) {
    return {
      success: false,
      gasEstimate: 0,
      error: error.message,
      warnings: ['Simulation failed completely'],
      assetImpact: {
        tokenTransfers: [],
        nativeValueChange: '0',
        approvalChanges: [],
      },
      drainRisk: {
        isDrainRisk: false,
        percentageAtRisk: 0,
        details: 'Could not assess drain risk',
      },
      abnormalBehavior: ['Simulation error'],
    };
  }
}

/**
 * Assess wallet drain risk
 */
function assessDrainRisk(
  balance: string,
  value: string,
  gasEstimate: number
): DrainRiskAssessment {
  try {
    const balanceBN = BigInt(balance);
    const valueBN = BigInt(value);
    const gasCostBN = BigInt(gasEstimate) * BigInt(50000000000); // Assume 50 gwei gas price
    
    const totalCost = valueBN + gasCostBN;
    
    if (balanceBN === 0n) {
      return {
        isDrainRisk: false,
        percentageAtRisk: 0,
        details: 'Insufficient balance',
      };
    }
    
    const percentage = Number((totalCost * 100n) / balanceBN);
    
    return {
      isDrainRisk: percentage > 80,
      percentageAtRisk: percentage,
      details:
        percentage > 80
          ? 'Transaction would consume >80% of wallet balance'
          : 'Transaction amount is within safe limits',
    };
  } catch (error) {
    return {
      isDrainRisk: false,
      percentageAtRisk: 0,
      details: 'Could not calculate drain risk',
    };
  }
}

/**
 * Analyze transaction data for suspicious patterns
 */
function analyzeTransactionData(data: string): {
  warnings: string[];
  suspiciousPatterns: string[];
} {
  const warnings: string[] = [];
  const suspiciousPatterns: string[] = [];
  
  // Check for common dangerous function selectors
  const selector = data.substring(0, 10);
  
  const dangerousSelectors: Record<string, string> = {
    '0xa9059cbb': 'ERC20 transfer',
    '0x095ea7b3': 'ERC20 approve',
    '0x23b872dd': 'ERC20 transferFrom',
    '0x42842e0e': 'NFT safeTransferFrom',
    '0xb88d4fde': 'NFT safeTransferFrom with data',
  };
  
  if (dangerousSelectors[selector]) {
    suspiciousPatterns.push(dangerousSelectors[selector]);
  }
  
  // Check for very long calldata (potential exploit)
  if (data.length > 10000) {
    warnings.push('Unusually large transaction data detected');
  }
  
  return { warnings, suspiciousPatterns };
}

/**
 * Check for unlimited approval
 */
function checkUnlimitedApproval(data: string): {
  isUnlimited: boolean;
  amount?: string;
} {
  // ERC20 approve function selector: 0x095ea7b3
  if (!data.startsWith('0x095ea7b3')) {
    return { isUnlimited: false };
  }
  
  try {
    // Decode approval amount (last 32 bytes)
    const amountHex = '0x' + data.substring(data.length - 64);
    const amount = BigInt(amountHex);
    
    // Check if it's max uint256 or close to it
    const maxUint256 = BigInt(
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    );
    const threshold = maxUint256 / 2n; // Consider >50% of max as unlimited
    
    return {
      isUnlimited: amount > threshold,
      amount: amount.toString(),
    };
  } catch (error) {
    return { isUnlimited: false };
  }
}

/**
 * Analyze asset impact (simplified version)
 */
async function analyzeAssetImpact(
  params: TransactionParams,
  provider: ethers.Provider,
  callResult?: string
): Promise<AssetImpact> {
  const tokenTransfers: TokenTransfer[] = [];
  const approvalChanges: ApprovalChange[] = [];
  
  // Calculate native value change
  const nativeValueChange = params.value || '0';
  
  // In production, this would parse event logs from eth_call with state override
  // For now, return basic structure
  
  return {
    tokenTransfers,
    nativeValueChange,
    approvalChanges,
  };
}

/**
 * Generate risk findings from simulation
 */
export function generateSimulationFindings(
  result: SimulationResult
): RiskFinding[] {
  const findings: RiskFinding[] = [];
  
  if (!result.success) {
    findings.push({
      flag: VulnerabilityFlag.UNCHECKED_EXTERNAL_CALL,
      severity: RiskSeverity.HIGH,
      description: 'Transaction simulation failed - would revert on-chain',
      evidence: result.error || 'Simulation reverted',
      recommendation: 'Do not execute this transaction',
    });
  }
  
  if (result.drainRisk.isDrainRisk) {
    findings.push({
      flag: VulnerabilityFlag.OWNER_ONLY_WITHDRAW,
      severity: RiskSeverity.CRITICAL,
      description: 'Transaction would drain majority of wallet balance',
      evidence: `${result.drainRisk.percentageAtRisk}% of balance at risk`,
      recommendation: 'Verify recipient and amount before proceeding',
    });
  }
  
  if (result.abnormalBehavior.includes('Unlimited approval detected')) {
    findings.push({
      flag: VulnerabilityFlag.UNLIMITED_APPROVAL,
      severity: RiskSeverity.HIGH,
      description: 'Transaction grants unlimited token approval',
      evidence: 'Approval amount set to maximum uint256',
      recommendation: 'Consider approving only the required amount',
    });
  }
  
  return findings;
}

/**
 * Get default RPC URL
 */
export function getRpcUrl(chainId: number): string {
  const RPC_URLS: Record<number, string> = {
    11155111: process.env.SOMNIA_RPC_URL || 'https://rpc.sepolia.org',
    1: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    137: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  };
  
  return RPC_URLS[chainId] || RPC_URLS[11155111];
}
