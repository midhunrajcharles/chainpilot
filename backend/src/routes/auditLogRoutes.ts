/**
 * Audit Log Routes
 * API endpoints for accessing audit log records
 */
// @ts-nocheck
import express, { Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { verifyAuditLog } from '../services/blockchainLogger';
import AuditLog from '../models/AuditLog';

const router = express.Router();

/**
 * GET /api/audits/recent
 * Get recent audit logs
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;
    const severity = req.query.severity as string;

    const query: any = {};
    if (severity) {
      query.severity = severity.toUpperCase();
    }

    const audits = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('-findings') // Exclude detailed findings for list view
      .lean();

    const total = await AuditLog.countDocuments(query);

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
    console.error('Error fetching recent audits:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/audits/verify/:hash
 * Verify audit log on blockchain
 */
router.get(
  '/verify/:hash',
  [
    param('hash')
      .isString()
      .matches(/^0x[a-fA-F0-9]{64}$/)
      .withMessage('Invalid report hash'),
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

      const { hash } = req.params;

      // Check database first
      const dbEntry = await AuditLog.findOne({ reportHash: hash }).lean();

      if (!dbEntry) {
        return res.status(404).json({
          success: false,
          error: 'Audit log not found',
        });
      }

      // Verify on blockchain if contract is deployed
      const contractDeployed = !!process.env.AUDIT_LOG_CONTRACT_ADDRESS;
      let onChainVerification = null;

      if (contractDeployed) {
        try {
          onChainVerification = await verifyAuditLog(hash, true);
        } catch (error) {
          console.error('On-chain verification failed:', error);
        }
      }

      res.json({
        success: true,
        data: {
          reportHash: hash,
          existsInDatabase: true,
          databaseEntry: dbEntry,
          onChainVerification: onChainVerification || {
            exists: false,
            message: 'On-chain verification not available',
          },
        },
      });
    } catch (error: any) {
      console.error('Error verifying audit log:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/audits/stats
 * Get platform-wide audit statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalAudits,
      verifiedOnChain,
      severityBreakdown,
      topRiskyContracts,
      auditsToday,
    ] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ isVerifiedOnChain: true }),
      AuditLog.aggregate([
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ]),
      AuditLog.aggregate([
        {
          $match: {
            severity: { $in: ['CRITICAL', 'HIGH'] },
          },
        },
        {
          $group: {
            _id: '$contractAddress',
            latestRiskScore: { $last: '$riskScore' },
            latestSeverity: { $last: '$severity' },
            auditCount: { $sum: 1 },
            lastAudit: { $last: '$createdAt' },
          },
        },
        {
          $sort: { latestRiskScore: -1 },
        },
        {
          $limit: 10,
        },
      ]),
      AuditLog.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    const severityMap = severityBreakdown.reduce((acc: any, item: any) => {
      acc[item._id.toLowerCase()] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalAudits,
        verifiedOnChain,
        auditsToday,
        severityBreakdown: {
          critical: severityMap.critical || 0,
          high: severityMap.high || 0,
          medium: severityMap.medium || 0,
          low: severityMap.low || 0,
        },
        topRiskyContracts,
      },
    });
  } catch (error: any) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/audits/contract/:address
 * Get all audits for a specific contract
 */
router.get(
  '/contract/:address',
  [
    param('address')
      .isString()
      .isLength({ min: 42, max: 42 })
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

      const audits = await AuditLog.find({
        contractAddress: address.toLowerCase(),
      })
        .sort({ createdAt: -1 })
        .lean();

      if (audits.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No audits found for this contract',
        });
      }

      // Calculate risk trend
      const riskTrend = audits.map((audit) => ({
        date: audit.createdAt,
        riskScore: audit.riskScore,
        severity: audit.severity,
      }));

      res.json({
        success: true,
        data: {
          contractAddress: address,
          totalAudits: audits.length,
          latestAudit: audits[0],
          audits,
          riskTrend,
        },
      });
    } catch (error: any) {
      console.error('Error fetching contract audits:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/audits/:id
 * Get detailed audit by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const audit = await AuditLog.findById(id).lean();

    if (!audit) {
      return res.status(404).json({
        success: false,
        error: 'Audit not found',
      });
    }

    res.json({
      success: true,
      data: audit,
    });
  } catch (error: any) {
    console.error('Error fetching audit:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
