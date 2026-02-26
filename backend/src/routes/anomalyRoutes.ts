/**
 * Anomaly Detection Routes
 * POST /api/anomaly/scan          — run a full proactive scan for a wallet
 * GET  /api/anomaly/events        — get persisted anomaly events
 * POST /api/anomaly/pre-tx-check  — check a pending transaction before sending
 * POST /api/anomaly/acknowledge/:id — acknowledge an anomaly event
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware';
import { extractWalletAddress, validateRequiredFields } from '../middleware/authMiddleware';
import { runAnomalyScan, checkPreTransaction } from '../services/anomalyDetector';
import { AnomalyEvent } from '../models/AnomalyEvent';

const router = Router();

// POST /api/anomaly/scan
router.post(
  '/scan',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const wallet = req.walletAddress;
    const result = await runAnomalyScan(wallet);
    res.json({ success: true, data: result });
  })
);

// GET /api/anomaly/events
router.get(
  '/events',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const wallet = req.walletAddress;
    const { unread, severity, limit = 50 } = req.query as any;

    const query: any = { walletAddress: wallet };
    if (unread === 'true')  query.acknowledged = false;
    if (severity)           query.severity = severity;

    const events = await AnomalyEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    const unreadCount = await AnomalyEvent.countDocuments({
      walletAddress: wallet,
      acknowledged: false,
    });

    res.json({ success: true, data: events, unreadCount });
  })
);

// POST /api/anomaly/pre-tx-check
router.post(
  '/pre-tx-check',
  extractWalletAddress,
  validateRequiredFields(['to', 'amount', 'token']),
  asyncHandler(async (req: any, res: any) => {
    const from  = req.walletAddress;
    const { to, amount, token } = req.body;
    const result = await checkPreTransaction(from, to, amount, token);
    res.json({ success: true, data: result });
  })
);

// POST /api/anomaly/acknowledge/:id
router.post(
  '/acknowledge/:id',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const event = await AnomalyEvent.findOneAndUpdate(
      { _id: req.params.id, walletAddress: req.walletAddress },
      { acknowledged: true, resolvedAt: new Date() },
      { new: true }
    );
    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    res.json({ success: true, data: event });
  })
);

// DELETE /api/anomaly/events — clear all acknowledged events
router.delete(
  '/events',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const result = await AnomalyEvent.deleteMany({
      walletAddress: req.walletAddress,
      acknowledged: true,
    });
    res.json({ success: true, deleted: result.deletedCount });
  })
);

export default router;
