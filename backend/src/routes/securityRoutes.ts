import { Router } from 'express';
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

    // Get transaction history for the address
    const transactions = await Transaction.find({
      $or: [
        { from: formattedAddress },
        { to: formattedAddress }
      ],
      status: 'confirmed'
    }).sort({ createdAt: -1 });

    // Calculate address reputation
    const transactionCount = transactions.length;
    const totalVolume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const lastSeen = transactions.length > 0 ? transactions[0].createdAt : new Date();
    
    // Check for suspicious patterns
    const suspiciousActivity = checkSuspiciousActivity(transactions);
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
      tags: generateAddressTags(transactions)
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

    // Get transaction history
    const transactions = await Transaction.find({
      $or: [
        { from: formattedAddress },
        { to: formattedAddress }
      ],
      status: 'confirmed'
    }).sort({ createdAt: -1 });

    const transactionCount = transactions.length;
    const totalVolume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const lastSeen = transactions.length > 0 ? transactions[0].createdAt : new Date();
    
    const suspiciousActivity = checkSuspiciousActivity(transactions);
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
      tags: generateAddressTags(transactions)
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

    // Check address against known scam addresses (mock data)
    const knownScamAddresses = [
      '0x1234567890123456789012345678901234567890', // Mock scam address
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'  // Mock scam address
    ];

    if (knownScamAddresses.includes(formattedAddress)) {
      isScam = true;
      confidence = 100;
      reasons.push('Address is on known scam list');
      suggestions.push('Block this address immediately');
    }

    // Check transaction patterns
    const transactions = await Transaction.find({
      $or: [
        { from: formattedAddress },
        { to: formattedAddress }
      ]
    });

    if (transactions.length === 0) {
      confidence += 20;
      reasons.push('No transaction history found');
      suggestions.push('Verify address through official channels');
    }

    // Check for suspicious activity patterns
    const suspiciousActivity = checkSuspiciousActivity(transactions);
    if (suspiciousActivity) {
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
function checkSuspiciousActivity(transactions: any[]): boolean {
  if (transactions.length < 3) return false;

  // Check for rapid transactions
  const recentTransactions = transactions.filter(tx => 
    Date.now() - tx.createdAt.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
  );

  if (recentTransactions.length > 50) return true;

  // Check for unusual amounts
  const amounts = transactions.map(tx => parseFloat(tx.amount));
  const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
  const unusualAmounts = amounts.filter(amount => amount > avgAmount * 10);

  return unusualAmounts.length > amounts.length * 0.1; // More than 10% unusual amounts
}

function generateAddressTags(transactions: any[]): string[] {
  const tags: string[] = [];

  if (transactions.length === 0) {
    tags.push('new_address');
  } else if (transactions.length > 100) {
    tags.push('frequent_user');
  } else if (transactions.length > 10) {
    tags.push('active_user');
  }

  const totalVolume = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  if (totalVolume > 100000) {
    tags.push('high_volume');
  }

  const recentTransactions = transactions.filter(tx => 
    Date.now() - tx.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
  );

  if (recentTransactions.length > 0) {
    tags.push('recently_active');
  }

  return tags;
}

export default router;
