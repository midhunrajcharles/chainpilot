/**
 * Blockchain Logger Service
 * Handles on-chain immutable audit logging
 */

import { ethers } from 'ethers';
import crypto from 'crypto';

export interface AuditLogEntry {
  reportHash: string;
  contractAddress: string;
  severity: string;
  timestamp: Date;
  txHash?: string;
  blockNumber?: number;
  initiator: string;
}

/**
 * Hash risk report for on-chain storage
 */
export function hashRiskReport(report: any): string {
  try {
    // Stringify with sorted keys for consistency
    const reportString = JSON.stringify(report, Object.keys(report).sort());
    
    // Generate SHA-256 hash
    const hash = crypto.createHash('sha256').update(reportString).digest('hex');
    
    return '0x' + hash;
  } catch (error: any) {
    throw new Error(`Failed to hash report: ${error.message}`);
  }
}

/**
 * Submit audit log to blockchain (when contract is deployed)
 */
export async function submitAuditLog(
  reportHash: string,
  contractAddress: string,
  severity: string,
  initiator: string,
  contractDeployed: boolean = false
): Promise<AuditLogEntry> {
  try {
    if (!contractDeployed) {
      // Graceful fallback - return entry without blockchain transaction
      console.log('AuditLog contract not deployed yet - skipping on-chain submission');
      return {
        reportHash,
        contractAddress,
        severity,
        timestamp: new Date(),
        initiator,
      };
    }
    
    // TODO: When AuditLog.sol is deployed, implement on-chain submission
    const auditLogContractAddress = process.env.AUDIT_LOG_CONTRACT_ADDRESS;
    if (!auditLogContractAddress) {
      throw new Error('AUDIT_LOG_CONTRACT_ADDRESS not configured');
    }
    
    const rpcUrl = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get wallet for transaction signing
    const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('BACKEND_WALLET_PRIVATE_KEY not configured');
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // AuditLog contract ABI (minimal)
    const contractABI = [
      'function logAudit(bytes32 _reportHash, address _contractAudited, string memory _severity) external returns (uint256)',
    ];
    
    const contract = new ethers.Contract(
      auditLogContractAddress,
      contractABI,
      wallet
    );
    
    // Submit transaction
    const tx = await contract.logAudit(
      reportHash,
      contractAddress,
      severity
    );
    
    console.log('Audit log transaction submitted:', tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    return {
      reportHash,
      contractAddress,
      severity,
      timestamp: new Date(),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      initiator,
    };
  } catch (error: any) {
    console.error('Failed to submit audit log to blockchain:', error.message);
    
    // Return entry without blockchain data
    return {
      reportHash,
      contractAddress,
      severity,
      timestamp: new Date(),
      initiator,
    };
  }
}

/**
 * Verify audit log on blockchain
 */
export async function verifyAuditLog(
  reportHash: string,
  contractDeployed: boolean = false
): Promise<{
  exists: boolean;
  entry?: {
    reportHash: string;
    contractAudited: string;
    initiator: string;
    timestamp: number;
    auditId: number;
  };
}> {
  try {
    if (!contractDeployed) {
      return { exists: false };
    }
    
    const auditLogContractAddress = process.env.AUDIT_LOG_CONTRACT_ADDRESS;
    if (!auditLogContractAddress) {
      throw new Error('AUDIT_LOG_CONTRACT_ADDRESS not configured');
    }
    
    const rpcUrl = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // AuditLog contract ABI (minimal)
    const contractABI = [
      'function verifyAudit(bytes32 _reportHash) external view returns (bool, uint256, address, uint256)',
    ];
    
    const contract = new ethers.Contract(
      auditLogContractAddress,
      contractABI,
      provider
    );
    
    const [exists, auditId, contractAudited, timestamp] =
      await contract.verifyAudit(reportHash);
    
    if (!exists) {
      return { exists: false };
    }
    
    return {
      exists: true,
      entry: {
        reportHash,
        contractAudited,
        initiator: '0x0000000000000000000000000000000000000000', // Would need to query event logs
        timestamp: Number(timestamp),
        auditId: Number(auditId),
      },
    };
  } catch (error: any) {
    console.error('Failed to verify audit log:', error.message);
    return { exists: false };
  }
}

/**
 * Get blockchain explorer URL for audit log transaction
 */
export function getExplorerUrl(txHash: string, chainId: number = 11155111): string {
  const explorers: Record<number, string> = {
    11155111: 'https://sepolia.etherscan.io', // Sepolia explorer
    1: 'https://etherscan.io',
    137: 'https://polygonscan.com',
  };
  
  const baseUrl = explorers[chainId] || explorers[11155111];
  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Generate audit report summary for hashing
 */
export function generateAuditReportForHashing(
  contractAddress: string,
  riskScore: number,
  severity: string,
  findings: any[],
  aiExplanation: any
): any {
  return {
    contractAddress,
    riskScore,
    severity,
    findingsCount: findings.length,
    findingsSummary: findings.map((f) => ({
      flag: f.flag,
      severity: f.severity,
    })),
    aiVerdict: aiExplanation.verdict,
    analyzedAt: new Date().toISOString(),
  };
}
