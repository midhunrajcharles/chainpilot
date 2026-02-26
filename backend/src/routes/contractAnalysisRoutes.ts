/**
 * Contract Analysis Routes
 * API endpoints for smart contract security analysis
 */
// @ts-nocheck
import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { analyzeContract } from '../services/contractAnalyzer';
import { generateRiskReport } from '../services/riskEngine';
import { explainVulnerabilities } from '../services/aiEngine';
import {
  hashRiskReport,
  submitAuditLog,
  generateAuditReportForHashing,
} from '../services/blockchainLogger';
import AuditLog from '../models/AuditLog';
import { ethers } from 'ethers';

const router = express.Router();

/**
 * POST /api/contracts/analyze
 * Analyze a smart contract for security vulnerabilities
 */
router.post(
  '/analyze',
  [
    body('contractAddress')
      .isString()
      .custom((value) => ethers.isAddress(value))
      .withMessage('Invalid contract address'),
    body('chainId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid chain ID'),
    body('userAddress')
      .optional()
      .isString()
      .withMessage('Invalid user address'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const {
        contractAddress,
        chainId = 11155111,
        userAddress = '0x0000000000000000000000000000000000000000',
      } = req.body;

      console.log(`Analyzing contract: ${contractAddress} on chain ${chainId}`);

      // Step 1: Analyze contract
      const analysisResult = await analyzeContract(contractAddress, chainId);

      // Step 2: Generate risk report
      const riskReport = generateRiskReport(analysisResult);

      // Step 3: Get AI explanation
      let aiExplanation;
      try {
        aiExplanation = await explainVulnerabilities(
          contractAddress,
          riskReport.findings,
          riskReport.riskScore,
          analysisResult.isVerified
        );
      } catch (error: any) {
        // Missing API key is a configuration error — surface it to the caller
        if (
          error?.message === 'AI service not configured' ||
          error?.message?.includes('No OpenAI') ||
          error?.message?.includes('not configured')
        ) {
          return res.status(500).json({
            success: false,
            error: 'AI service not configured. Please add OPENAI_API_KEY to backend/.env',
          });
        }
        // Other AI failures (rate limit, network) fall back gracefully
        console.error('AI explanation failed, using fallback:', error?.message);
        aiExplanation = {
          explanation: `Contract risk score: ${riskReport.riskScore}/100`,
          recommendation: 'Review findings carefully',
          technicalSummary: 'AI analysis unavailable',
          verdict: riskReport.severity >= 'HIGH' ? 'DANGER' : 'CAUTION',
        };
      }

      // Step 4: Create audit report for hashing
      const auditReport = generateAuditReportForHashing(
        contractAddress,
        riskReport.riskScore,
        riskReport.severity,
        riskReport.findings,
        aiExplanation
      );

      const reportHash = hashRiskReport(auditReport);

      // Step 5: Submit to blockchain (if configured)
      const contractDeployed = !!process.env.AUDIT_LOG_CONTRACT_ADDRESS;
      let auditLogEntry;
      try {
        auditLogEntry = await submitAuditLog(
          reportHash,
          contractAddress,
          riskReport.severity,
          userAddress,
          contractDeployed
        );
      } catch (error) {
        console.error('Blockchain submission failed:', error);
        auditLogEntry = {
          reportHash,
          contractAddress,
          severity: riskReport.severity,
          timestamp: new Date(),
          initiator: userAddress,
        };
      }

      // Step 6: Save to database
      const auditLog = new AuditLog({
        reportHash,
        contractAddress: contractAddress.toLowerCase(),
        chainId,
        riskScore: riskReport.riskScore,
        severity: riskReport.severity,
        findingsCount: riskReport.findings.length,
        findings: riskReport.findings.map((f) => ({
          flag: f.flag,
          severity: f.severity,
          description: f.description,
        })),
        aiVerdict: aiExplanation.verdict,
        txHash: auditLogEntry.txHash,
        blockNumber: auditLogEntry.blockNumber,
        initiator: userAddress.toLowerCase(),
        isVerifiedOnChain: !!auditLogEntry.txHash,
        analyzedAt: new Date(),
      });

      await auditLog.save();

      // Step 7: Return complete analysis
      res.json({
        success: true,
        data: {
          contractAddress,
          chainId,
          isVerified: analysisResult.isVerified,
          riskScore: riskReport.riskScore,
          severity: riskReport.severity,
          summary: riskReport.summary,
          findings: riskReport.findings,
          flagBreakdown: riskReport.flagBreakdown,
          aiExplanation,
          auditLog: {
            reportHash,
            txHash: auditLogEntry.txHash,
            explorerUrl: auditLog.explorerUrl,
            isVerifiedOnChain: !!auditLogEntry.txHash,
          },
          analyzedAt: riskReport.timestamp,
        },
      });
    } catch (error: any) {
      console.error('Contract analysis error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Contract analysis failed',
      });
    }
  }
);

/**
 * GET /api/contracts/:address/history
 * Get analysis history for a contract
 */
router.get(
  '/:address/history',
  [
    param('address')
      .isString()
      .custom((value) => ethers.isAddress(value))
      .withMessage('Invalid contract address'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { address } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = parseInt(req.query.skip as string) || 0;

      const audits = await AuditLog.find({
        contractAddress: address.toLowerCase(),
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await AuditLog.countDocuments({
        contractAddress: address.toLowerCase(),
      });

      res.json({
        success: true,
        data: {
          audits,
          pagination: {
            total,
            limit,
            skip,
            hasMore: skip + audits.length < total,
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching audit history:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/contracts/stats
 * Get aggregate statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalAudits,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      recentAudits,
    ] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ severity: 'CRITICAL' }),
      AuditLog.countDocuments({ severity: 'HIGH' }),
      AuditLog.countDocuments({ severity: 'MEDIUM' }),
      AuditLog.countDocuments({ severity: 'LOW' }),
      AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('contractAddress severity riskScore createdAt')
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        totalAudits,
        severityBreakdown: {
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        },
        recentAudits,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
