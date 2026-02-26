import { Router } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware';
import { extractWalletAddress, validateRequiredFields, validateObjectId } from '../middleware/authMiddleware';
import { ConditionalTransaction } from '../models/ConditionalTransaction';
import { ScheduledTransaction } from '../models/ScheduledTransaction';
import { ApiResponse } from '../types';
import { validateWalletAddress, formatWalletAddress, validateConditionalExpression, calculateNextScheduledDate } from '../utils/helpers';

const router = Router();

// POST /api/transactions/conditional
// Description: Create a conditional transaction that executes when conditions are met
router.post('/conditional',
  extractWalletAddress,
  validateRequiredFields(['amount', 'token', 'recipient', 'condition']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { amount, token, recipient, condition } = req.body;

    // Validate recipient address
    if (!validateWalletAddress(recipient)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient address format'
      });
    }

    // Validate condition
    if (!validateConditionalExpression(condition)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid conditional expression'
      });
    }

    const conditionalTransaction = new ConditionalTransaction({
      walletAddress: userWalletAddress,
      amount: amount.toString(),
      token: token.toUpperCase(),
      recipient: formatWalletAddress(recipient),
      condition: {
        type: condition.type,
        operator: condition.operator,
        value: condition.value,
        token: condition.token?.toUpperCase()
      },
      status: 'active'
    });

    await conditionalTransaction.save();

    const response: ApiResponse = {
      success: true,
      data: conditionalTransaction,
      message: 'Conditional transaction created successfully'
    };

    res.status(201).json(response);
  })
);

// GET /api/transactions/conditional
// Description: Get all active conditional transactions
router.get('/conditional',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;

    const conditionalTransactions = await ConditionalTransaction.find({
      walletAddress: userWalletAddress,
      status: 'active'
    }).sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      data: conditionalTransactions
    };

    res.status(200).json(response);
  })
);

// DELETE /api/transactions/conditional/:id
// Description: Cancel a conditional transaction
router.delete('/conditional/:id',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const conditionalId = req.params.id;

    const conditionalTransaction = await ConditionalTransaction.findOneAndUpdate(
      {
        _id: conditionalId,
        walletAddress: userWalletAddress,
        status: 'active'
      },
      { status: 'cancelled' },
      { new: true }
    );

    if (!conditionalTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Conditional transaction not found or already processed'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Conditional transaction cancelled successfully'
    };

    res.status(200).json(response);
  })
);

// POST /api/transactions/scheduled
// Description: Schedule a transaction for future execution
router.post('/scheduled',
  extractWalletAddress,
  validateRequiredFields(['amount', 'token', 'recipient', 'scheduledFor']),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { amount, token, recipient, scheduledFor, recurring } = req.body;

    // Validate recipient address
    if (!validateWalletAddress(recipient)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient address format'
      });
    }

    // Validate scheduled date
    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scheduled date - must be in the future'
      });
    }

    // Validate recurring if provided
    if (recurring) {
      if (!['daily', 'weekly', 'monthly'].includes(recurring.frequency)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid recurring frequency'
        });
      }

      if (recurring.endDate) {
        const endDate = new Date(recurring.endDate);
        if (isNaN(endDate.getTime()) || endDate <= scheduledDate) {
          return res.status(400).json({
            success: false,
            error: 'Invalid end date for recurring transaction'
          });
        }
      }
    }

    const scheduledTransaction = new ScheduledTransaction({
      walletAddress: userWalletAddress,
      amount: amount.toString(),
      token: token.toUpperCase(),
      recipient: formatWalletAddress(recipient),
      scheduledFor: scheduledDate,
      recurring: recurring ? {
        frequency: recurring.frequency,
        endDate: recurring.endDate ? new Date(recurring.endDate) : undefined
      } : undefined,
      status: 'scheduled'
    });

    await scheduledTransaction.save();

    const response: ApiResponse = {
      success: true,
      data: scheduledTransaction,
      message: 'Scheduled transaction created successfully'
    };

    res.status(201).json(response);
  })
);

// GET /api/transactions/scheduled
// Description: Get all scheduled transactions
router.get('/scheduled',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { status } = req.query;

    let query: any = { walletAddress: userWalletAddress };
    if (status) {
      query.status = status;
    }

    const scheduledTransactions = await ScheduledTransaction.find(query)
      .sort({ scheduledFor: 1 });

    const response: ApiResponse = {
      success: true,
      data: scheduledTransactions
    };

    res.status(200).json(response);
  })
);

// PUT /api/transactions/scheduled/:id
// Description: Update a scheduled transaction
router.put('/scheduled/:id',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const scheduledId = req.params.id;
    const { scheduledFor, recurring } = req.body;

    const scheduledTransaction = await ScheduledTransaction.findOne({
      _id: scheduledId,
      walletAddress: userWalletAddress,
      status: 'scheduled'
    });

    if (!scheduledTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled transaction not found or already processed'
      });
    }

    // Update scheduled date if provided
    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid scheduled date - must be in the future'
        });
      }
      scheduledTransaction.scheduledFor = scheduledDate;
    }

    // Update recurring if provided
    if (recurring !== undefined) {
      if (recurring === null) {
        scheduledTransaction.recurring = undefined;
      } else {
        if (!['daily', 'weekly', 'monthly'].includes(recurring.frequency)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid recurring frequency'
          });
        }

        scheduledTransaction.recurring = {
          frequency: recurring.frequency,
          endDate: recurring.endDate ? new Date(recurring.endDate) : undefined
        };
      }
    }

    await scheduledTransaction.save();

    const response: ApiResponse = {
      success: true,
      data: scheduledTransaction,
      message: 'Scheduled transaction updated successfully'
    };

    res.status(200).json(response);
  })
);

// DELETE /api/transactions/scheduled/:id
// Description: Cancel a scheduled transaction
router.delete('/scheduled/:id',
  extractWalletAddress,
  validateObjectId('id'),
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const scheduledId = req.params.id;

    const scheduledTransaction = await ScheduledTransaction.findOneAndUpdate(
      {
        _id: scheduledId,
        walletAddress: userWalletAddress,
        status: 'scheduled'
      },
      { status: 'cancelled' },
      { new: true }
    );

    if (!scheduledTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled transaction not found or already processed'
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Scheduled transaction cancelled successfully'
    };

    res.status(200).json(response);
  })
);

export default router;
