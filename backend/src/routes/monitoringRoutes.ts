/**
 * Monitoring Routes
 * API endpoints for autonomous contract monitoring
 */
// @ts-nocheck
import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import {
  addMonitor,
  removeMonitor,
  getMonitor,
  triggerImmediateCheck,
} from '../services/monitoringEngine';
import ContractMonitor from '../models/ContractMonitor';
import { ethers } from 'ethers';

const router = express.Router();

/**
 * POST /api/monitors
 * Create new contract monitor
 */
router.post(
  '/',
  [
    body('contractAddress')
      .isString()
      .custom((value) => ethers.isAddress(value))
      .withMessage('Invalid contract address'),
    body('chainId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid chain ID'),
    body('thresholds')
      .optional()
      .isObject()
      .withMessage('Thresholds must be an object'),
    body('thresholds.riskScoreIncrease')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Risk score increase must be 0-100'),
    body('thresholds.liquidityChangePercent')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Liquidity change percent must be 0-100'),
    body('thresholds.largeTransferAmount')
      .optional()
      .isString()
      .withMessage('Large transfer amount must be a string'),
    body('userAddress')
      .isString()
      .custom((value) => ethers.isAddress(value))
      .withMessage('Invalid user address'),
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

      const {
        contractAddress,
        chainId = 11155111,
        thresholds = {},
        userAddress,
      } = req.body;

      // Check if monitor already exists
      const existing = await ContractMonitor.findOne({
        userId: userAddress.toLowerCase(),
        contractAddress: contractAddress.toLowerCase(),
        isActive: true,
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Monitor already exists for this contract',
        });
      }

      // Create monitor
      const monitor = new ContractMonitor({
        userId: userAddress.toLowerCase(),
        contractAddress: contractAddress.toLowerCase(),
        chainId,
        thresholds: {
          riskScoreIncrease: thresholds.riskScoreIncrease,
          liquidityChangePercent: thresholds.liquidityChangePercent,
          largeTransferAmount: thresholds.largeTransferAmount,
          checkIntervalMinutes: thresholds.checkIntervalMinutes || 5,
        },
        isActive: true,
        alertHistory: [],
      });

      await monitor.save();

      // Add to active monitoring
      addMonitor({
        id: monitor._id.toString(),
        userId: userAddress.toLowerCase(),
        contractAddress: contractAddress.toLowerCase(),
        chainId,
        thresholds: monitor.thresholds,
        isActive: true,
        createdAt: monitor.createdAt,
        alertHistory: [],
      });

      res.json({
        success: true,
        data: monitor,
      });
    } catch (error: any) {
      console.error('Error creating monitor:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/monitors
 * Get user's monitors
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userAddress, isActive } = req.query;

    if (!userAddress) {
      return res.status(400).json({
        success: false,
        error: 'userAddress is required',
      });
    }

    const query: any = {
      userId: (userAddress as string).toLowerCase(),
    };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const monitors = await ContractMonitor.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: monitors,
    });
  } catch (error: any) {
    console.error('Error fetching monitors:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/monitors/:id
 * Get monitor details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const monitor = await ContractMonitor.findById(id).lean();

    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor not found',
      });
    }

    res.json({
      success: true,
      data: monitor,
    });
  } catch (error: any) {
    console.error('Error fetching monitor:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/monitors/:id/check
 * Trigger immediate check
 */
router.post('/:id/check', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const monitor = await ContractMonitor.findById(id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor not found',
      });
    }

    if (!monitor.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Monitor is not active',
      });
    }

    // Trigger immediate check
    const result = await triggerImmediateCheck(id);

    res.json({
      success: true,
      data: {
        checkCompleted: true,
        newAlertsCount: result.alerts.length,
        alerts: result.alerts,
      },
    });
  } catch (error: any) {
    console.error('Error triggering check:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PATCH /api/monitors/:id
 * Update monitor settings
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const monitor = await ContractMonitor.findById(id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor not found',
      });
    }

    // Update allowed fields
    if (updates.thresholds) {
      monitor.thresholds = { ...monitor.thresholds, ...updates.thresholds };
    }

    if (updates.notificationSettings) {
      monitor.notificationSettings = {
        ...monitor.notificationSettings,
        ...updates.notificationSettings,
      };
    }

    if (updates.isActive !== undefined) {
      monitor.isActive = updates.isActive;

      if (updates.isActive) {
        addMonitor({
          id: monitor._id.toString(),
          userId: monitor.userId,
          contractAddress: monitor.contractAddress,
          chainId: monitor.chainId,
          thresholds: monitor.thresholds,
          isActive: true,
          createdAt: monitor.createdAt,
          alertHistory: monitor.alertHistory,
        });
      } else {
        removeMonitor(monitor._id.toString());
      }
    }

    await monitor.save();

    res.json({
      success: true,
      data: monitor,
    });
  } catch (error: any) {
    console.error('Error updating monitor:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/monitors/:id
 * Delete monitor
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const monitor = await ContractMonitor.findById(id);

    if (!monitor) {
      return res.status(404).json({
        success: false,
        error: 'Monitor not found',
      });
    }

    // Remove from active monitoring
    removeMonitor(id);

    // Soft delete (deactivate)
    monitor.isActive = false;
    await monitor.save();

    res.json({
      success: true,
      message: 'Monitor deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting monitor:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/monitors/:id/alerts/:alertId/acknowledge
 * Acknowledge alert
 */
router.post(
  '/:id/alerts/:alertId/acknowledge',
  async (req: Request, res: Response) => {
    try {
      const { id, alertId } = req.params;

      const monitor = await ContractMonitor.findById(id);

      if (!monitor) {
        return res.status(404).json({
          success: false,
          error: 'Monitor not found',
        });
      }

      await monitor.acknowledgeAlert(alertId);

      res.json({
        success: true,
        message: 'Alert acknowledged',
      });
    } catch (error: any) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export default router;
