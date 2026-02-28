import { Router } from 'express';
import { ethers } from 'ethers';
import { asyncHandler } from '../middleware/errorMiddleware';
import { extractWalletAddress, validateRequiredFields } from '../middleware/authMiddleware';
import { Transaction } from '../models/Transaction';
import { ApiResponse, RiskAssessment, AddressReputation, ScamDetection, TransactionValidation } from '../types';
import { validateWalletAddress, formatWalletAddress, calculateRiskScore } from '../utils/helpers';

const router = Router();

// POST /api/security/risk-assessment
// Description: Assess risk level of a transaction before execution
router.post('/risk-assessment',
  extractWalletAddress,
  validateRequiredFields(['address', 'amount', 'token']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { address, amount, token } = req.body;

    if (!validateWalletAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    const formattedAddress = formatWalletAddress(address);

    // Get app transaction history + live on-chain activity
    const dbTransactions = await Transaction.find({
      $or: [
        { from: formattedAddress },
        { to: formattedAddress }
      ],
      status: 'confirmed'
    }).sort({ createdAt: -1 });

    const onchain = await fetchOnchainActivity(formattedAddress);
    const mergedActivity = mergeAddressActivity(dbTransactions, onchain.activity);

    // Calculate address reputation
    const transactionCount = Math.max(mergedActivity.length, onchain.signedTxCount);
    const totalVolume = mergedActivity.reduce((sum, tx) => sum + Number.parseFloat(tx.amount || '0'), 0);
    const lastSeen = mergedActivity.length > 0 ? mergedActivity[0].timestamp : new Date();
    
    // Check for suspicious patterns
    const suspiciousActivity = checkSuspiciousActivity(mergedActivity);
    const riskScore = calculateRiskScore({
      transactionCount,
      totalVolume,
      lastSeen,
      suspiciousActivity
    });

    // Generate warnings and recommendations
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (riskScore < 30) {
      warnings.push('High risk address detected');
      recommendations.push('Consider using a different recipient address');
      recommendations.push('Verify the recipient through alternative channels');
    } else if (riskScore < 60) {
      warnings.push('Medium risk address');
      recommendations.push('Double-check the recipient address');
    } else {
      recommendations.push('Address appears trustworthy');
    }

    if (parseFloat(amount) > 1000) {
      warnings.push('Large transaction amount');
      recommendations.push('Consider splitting into smaller transactions');
    }

    if (transactionCount === 0) {
      warnings.push('No transaction history found');
      recommendations.push('Verify recipient address carefully');
    }

    const addressReputation = {
      transactionCount,
      totalVolume,
      riskScore,
      lastSeen: lastSeen.toISOString(),
      tags: generateAddressTags(mergedActivity)
    };

    const assessment: RiskAssessment = {
      riskScore,
      warnings,
      recommendations,
      addressReputation
    };

    const response: ApiResponse = {
      success: true,
      data: assessment
    };

    res.status(200).json(response);
  })
);

// GET /api/security/address-reputation/:address
// Description: Get reputation and transaction history of a wallet address
router.get('/address-reputation/:address',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const address = req.params.address;

    if (!validateWalletAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    const formattedAddress = formatWalletAddress(address);

    const dbTransactions = await Transaction.find({
      $or: [
        { from: formattedAddress },
        { to: formattedAddress }
      ],
      status: 'confirmed'
    }).sort({ createdAt: -1 });

    const onchain = await fetchOnchainActivity(formattedAddress);
    const mergedActivity = mergeAddressActivity(dbTransactions, onchain.activity);

    const transactionCount = Math.max(mergedActivity.length, onchain.signedTxCount);
    const totalVolume = mergedActivity.reduce((sum, tx) => sum + Number.parseFloat(tx.amount || '0'), 0);
    const lastSeen = mergedActivity.length > 0 ? mergedActivity[0].timestamp : new Date();
    
    const suspiciousActivity = checkSuspiciousActivity(mergedActivity);
    const riskScore = calculateRiskScore({
      transactionCount,
      totalVolume,
      lastSeen,
      suspiciousActivity
    });

    const reputation: AddressReputation = {
      address: formattedAddress,
      transactionCount,
      totalVolume,
      riskScore,
      lastSeen: lastSeen.toISOString(),
      tags: generateAddressTags(mergedActivity)
    };

    const response: ApiResponse = {
      success: true,
      data: reputation
    };

    res.status(200).json(response);
  })
);

// POST /api/security/scam-detection
// Description: Detect potential scam addresses or messages
router.post('/scam-detection',
  extractWalletAddress,
  validateRequiredFields(['address']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { address, message } = req.body;

    if (!validateWalletAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }

    const formattedAddress = formatWalletAddress(address);

    // Check against known scam patterns
    const scamPatterns = [
      /send.*urgent/i,
      /verify.*wallet/i,
      /claim.*reward/i,
      /free.*token/i,
      /airdrop.*claim/i
    ];

    let isScam = false;
    let confidence = 0;
    const reasons: string[] = [];
    const suggestions: string[] = [];

    // Check message for scam patterns
    if (message) {
      const scamMatches = scamPatterns.filter(pattern => pattern.test(message));
      if (scamMatches.length > 0) {
        isScam = true;
        confidence += 80;
        reasons.push('Message contains known scam patterns');
        suggestions.push('Do not send any funds to this address');
      }
    }

    // Check on-chain + app transaction patterns
    const dbTransactions = await Transaction.find({
      $or: [
        { from: formattedAddress },
        { to: formattedAddress }
      ]
    });

    const onchain = await fetchOnchainActivity(formattedAddress);
    const mergedActivity = mergeAddressActivity(dbTransactions, onchain.activity);

    if (mergedActivity.length === 0) {
      confidence += 20;
      reasons.push('No on-chain transaction activity found in indexed window');
      suggestions.push('Verify address through official channels');
    }

    // Check for suspicious activity patterns
    const suspiciousActivity = checkSuspiciousActivity(mergedActivity);
    if (suspiciousActivity) {
      isScam = true;
      confidence += 30;
      reasons.push('Suspicious transaction patterns detected');
      suggestions.push('Exercise extreme caution');
    }

    const detection: ScamDetection = {
      isScam,
      confidence: Math.min(confidence, 100),
      reasons,
      suggestions: suggestions.length > 0 ? suggestions : ['Address appears safe']
    };

    const response: ApiResponse = {
      success: true,
      data: detection
    };

    res.status(200).json(response);
  })
);

// POST /api/security/transaction-validation
// Description: Validate transaction parameters before execution
router.post('/transaction-validation',
  extractWalletAddress,
  validateRequiredFields(['from', 'to', 'amount', 'token']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { from, to, amount, token, gasEstimate } = req.body;

    const warnings: string[] = [];
    let isValid = true;

    // Validate addresses
    if (!validateWalletAddress(from)) {
      warnings.push('Invalid sender address format');
      isValid = false;
    }

    if (!validateWalletAddress(to)) {
      warnings.push('Invalid recipient address format');
      isValid = false;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      warnings.push('Invalid amount - must be a positive number');
      isValid = false;
    }

    // Validate token
    if (!token || typeof token !== 'string') {
      warnings.push('Invalid token symbol');
      isValid = false;
    }

    // Check for self-transfer
    if (from.toLowerCase() === to.toLowerCase()) {
      warnings.push('Cannot send to the same address');
      isValid = false;
    }

    // Check wallet address matches
    if (from.toLowerCase() !== userWalletAddress) {
      warnings.push('Sender address does not match your wallet');
      isValid = false;
    }

    // Check for large amounts
    if (amountNum > 10000) {
      warnings.push('Large transaction amount detected');
    }

    // Mock gas estimation
    const estimatedGas = gasEstimate || '21000';
    const gasPrice = 20; // Gwei
    const gasCost = parseFloat(estimatedGas) * gasPrice / 1e9;
    const totalCost = amountNum + gasCost;

    const validation: TransactionValidation = {
      isValid,
      warnings,
      gasEstimate: estimatedGas,
      totalCost: totalCost.toString()
    };

    const response: ApiResponse = {
      success: true,
      data: validation
    };

    res.status(200).json(response);
  })
);

// Helper functions
type IndexedActivity = {
  hash: string;
  amount: string;
  timestamp: Date;
  from?: string;
  to?: string;
};

function checkSuspiciousActivity(transactions: IndexedActivity[]): boolean {
  if (transactions.length < 3) return false;

  // Check for rapid transactions
  const recentTransactions = transactions.filter(tx => 
    Date.now() - tx.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
  );

  if (recentTransactions.length > 50) return true;

  // Check for unusual amounts
  const amounts = transactions.map(tx => Number.parseFloat(tx.amount || '0'));
  const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const unusualAmounts = amounts.filter(amount => amount > avgAmount * 10);

  return unusualAmounts.length > amounts.length * 0.1; // More than 10% unusual amounts
}

function generateAddressTags(transactions: IndexedActivity[]): string[] {
  const tags: string[] = [];

  if (transactions.length === 0) {
    tags.push('new_address');
  } else if (transactions.length > 100) {
    tags.push('frequent_user');
  } else if (transactions.length > 10) {
    tags.push('active_user');
  }

  const totalVolume = transactions.reduce((sum, tx) => sum + Number.parseFloat(tx.amount || '0'), 0);
  if (totalVolume > 100000) {
    tags.push('high_volume');
  }

  const recentTransactions = transactions.filter(tx => 
    Date.now() - tx.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
  );

  if (recentTransactions.length > 0) {
    tags.push('recently_active');
  }

  return tags;
}

function getSecurityRpcCandidates(): string[] {
  const candidates = [
    process.env.SOMNIA_RPC_URL,
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.drpc.org',
    'https://rpc.ankr.com/eth_sepolia',
    'https://rpc.sepolia.org',
  ];

  return Array.from(new Set(candidates.filter((url): url is string => !!url && url.trim().length > 0)));
}

async function getHealthyProvider(): Promise<ethers.JsonRpcProvider | null> {
  const candidates = getSecurityRpcCandidates();
  const probeTimeoutMs = Math.max(800, Number(process.env.SECURITY_RPC_PROBE_TIMEOUT_MS || 2500));

  for (const url of candidates) {
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await withTimeout(provider.getBlockNumber(), probeTimeoutMs);
      return provider;
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchOnchainActivity(address: string): Promise<{ activity: IndexedActivity[]; signedTxCount: number }> {
  try {
    const provider = await getHealthyProvider();
    if (!provider) {
      return { activity: [], signedTxCount: 0 };
    }

    const normalized = address.toLowerCase();
    const blockWindow = Math.max(20, Number(process.env.SECURITY_INDEX_BLOCK_WINDOW || 60));
    const maxResults = Math.max(25, Number(process.env.SECURITY_INDEX_MAX_TXS || 150));
    const maxDurationMs = Math.max(1500, Number(process.env.SECURITY_INDEX_TIMEOUT_MS || 6000));
    const rpcCallTimeoutMs = Math.max(700, Number(process.env.SECURITY_RPC_CALL_TIMEOUT_MS || 1800));
    const startedAt = Date.now();

    const latestBlock = await withTimeout(provider.getBlockNumber(), rpcCallTimeoutMs);
    const fromBlock = Math.max(0, latestBlock - blockWindow);
    const signedTxCount = await withTimeout(provider.getTransactionCount(address, 'latest').catch(() => 0), rpcCallTimeoutMs);

    const activity: IndexedActivity[] = [];

    for (let blockNumber = latestBlock; blockNumber >= fromBlock; blockNumber--) {
      if (Date.now() - startedAt >= maxDurationMs) break;
      if (activity.length >= maxResults) break;

      try {
        const block = await withTimeout(provider.getBlock(blockNumber, true), rpcCallTimeoutMs);
        if (!block || !Array.isArray(block.transactions)) continue;

        for (const rawTx of block.transactions as any[]) {
          if (!rawTx) continue;

          let tx: any = rawTx;
          if (typeof rawTx === 'string') {
            tx = await withTimeout(provider.getTransaction(rawTx), rpcCallTimeoutMs).catch(() => null);
            if (!tx) continue;
          }

          const from = tx.from?.toLowerCase();
          const to = tx.to?.toLowerCase();
          if (from !== normalized && to !== normalized) continue;

          const amount = ethers.formatEther(tx.value ?? 0n);
          activity.push({
            hash: tx.hash,
            amount,
            timestamp: new Date((block.timestamp || 0) * 1000),
            from: tx.from,
            to: tx.to,
          });

          if (activity.length >= maxResults) break;
        }
      } catch {
        continue;
      }
    }

    return { activity, signedTxCount };
  } catch {
    return { activity: [], signedTxCount: 0 };
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Timed out')), timeoutMs);
    }),
  ]);
}

function mergeAddressActivity(dbTransactions: any[], onchainActivity: IndexedActivity[]): IndexedActivity[] {
  const dbMapped: IndexedActivity[] = dbTransactions.map((tx) => ({
    hash: tx.txHash || `db:${tx._id.toString()}`,
    amount: (tx.amount ?? '0').toString(),
    timestamp: tx.createdAt ? new Date(tx.createdAt) : new Date(),
    from: tx.from,
    to: tx.to,
  }));

  const map = new Map<string, IndexedActivity>();

  for (const tx of [...onchainActivity, ...dbMapped]) {
    if (!map.has(tx.hash)) {
      map.set(tx.hash, tx);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export default router;
