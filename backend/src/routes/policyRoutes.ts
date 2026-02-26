/**
 * Security Policy Routes
 * Full CRUD for personalised security rules + whitelist management.
 * Policies are checked at transaction validation time.
 *
 * GET    /api/policies              — list all policies for the wallet
 * POST   /api/policies              — create a policy
 * GET    /api/policies/:id          — get a single policy
 * PUT    /api/policies/:id          — replace a policy
 * PATCH  /api/policies/:id          — partial update (toggle, rename…)
 * DELETE /api/policies/:id          — delete a policy
 * POST   /api/policies/evaluate     — evaluate policies against a pending tx
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware';
import { extractWalletAddress, validateRequiredFields } from '../middleware/authMiddleware';
import { SecurityPolicy } from '../models/SecurityPolicy';
import { Transaction } from '../models/Transaction';

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// LIST
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const policies = await SecurityPolicy.find({ walletAddress: req.walletAddress }).sort({ createdAt: -1 });
    res.json({ success: true, data: policies });
  })
);

// ──────────────────────────────────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  '/',
  extractWalletAddress,
  validateRequiredFields(['name']),
  asyncHandler(async (req: any, res: any) => {
    const { name, description, rules = [], whitelistedAddresses = [] } = req.body;

    // Normalise whitelisted addresses to lowercase
    const normalized = whitelistedAddresses.map((a: string) => a.toLowerCase());

    const policy = await SecurityPolicy.create({
      walletAddress:        req.walletAddress,
      name,
      description,
      rules,
      whitelistedAddresses: normalized,
      enabled:              true,
    });
    res.status(201).json({ success: true, data: policy });
  })
);

// ──────────────────────────────────────────────────────────────────────────────
// GET ONE
// ──────────────────────────────────────────────────────────────────────────────
router.get(
  '/:id',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const policy = await SecurityPolicy.findOne({ _id: req.params.id, walletAddress: req.walletAddress });
    if (!policy) return res.status(404).json({ success: false, error: 'Policy not found' });
    res.json({ success: true, data: policy });
  })
);

// ──────────────────────────────────────────────────────────────────────────────
// REPLACE
// ──────────────────────────────────────────────────────────────────────────────
router.put(
  '/:id',
  extractWalletAddress,
  validateRequiredFields(['name']),
  asyncHandler(async (req: any, res: any) => {
    const { name, description, rules, whitelistedAddresses, enabled } = req.body;
    const policy = await SecurityPolicy.findOneAndUpdate(
      { _id: req.params.id, walletAddress: req.walletAddress },
      { name, description, rules, whitelistedAddresses: (whitelistedAddresses ?? []).map((a: string) => a.toLowerCase()), enabled },
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ success: false, error: 'Policy not found' });
    res.json({ success: true, data: policy });
  })
);

// ──────────────────────────────────────────────────────────────────────────────
// PARTIAL UPDATE
// ──────────────────────────────────────────────────────────────────────────────
router.patch(
  '/:id',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const allowed = ['name', 'description', 'enabled', 'rules', 'whitelistedAddresses'];
    const update: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.whitelistedAddresses) {
      update.whitelistedAddresses = update.whitelistedAddresses.map((a: string) => a.toLowerCase());
    }

    const policy = await SecurityPolicy.findOneAndUpdate(
      { _id: req.params.id, walletAddress: req.walletAddress },
      { $set: update },
      { new: true }
    );
    if (!policy) return res.status(404).json({ success: false, error: 'Policy not found' });
    res.json({ success: true, data: policy });
  })
);

// ──────────────────────────────────────────────────────────────────────────────
// DELETE
// ──────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const policy = await SecurityPolicy.findOneAndDelete({ _id: req.params.id, walletAddress: req.walletAddress });
    if (!policy) return res.status(404).json({ success: false, error: 'Policy not found' });
    res.json({ success: true, message: 'Policy deleted' });
  })
);

// ──────────────────────────────────────────────────────────────────────────────
// EVALUATE — check all active policies against a pending transaction
// ──────────────────────────────────────────────────────────────────────────────
router.post(
  '/evaluate',
  extractWalletAddress,
  validateRequiredFields(['to', 'amount', 'token']),
  asyncHandler(async (req: any, res: any) => {
    const wallet = req.walletAddress;
    const { to, amount, token, contractAddress } = req.body;

    const policies = await SecurityPolicy.find({ walletAddress: wallet, enabled: true });
    if (!policies.length) {
      return res.json({ success: true, data: { allowed: true, violations: [], warnings: [] } });
    }

    const violations: string[] = [];
    const warnings:   string[] = [];
    let   hardBlock = false;

    const amountNum = parseFloat(amount) || 0;
    const recipient = (to ?? '').toLowerCase();

    for (const policy of policies) {
      for (const rule of policy.rules) {
        if (!rule.enabled) continue;

        switch (rule.type) {
          case 'MAX_TRANSACTION_VALUE': {
            const max = parseFloat(rule.params.maxValue ?? '99999');
            const ruleToken = (rule.params.token ?? 'ETH').toUpperCase();
            if (token.toUpperCase() === ruleToken && amountNum > max) {
              const msg = `[${policy.name}] Transaction of ${amountNum} ${token} exceeds limit of ${max} ${ruleToken}`;
              if (rule.action === 'BLOCK') { violations.push(msg); hardBlock = true; }
              else warnings.push(msg);
            }
            break;
          }

          case 'WHITELIST_ONLY': {
            const isWhitelisted = policy.whitelistedAddresses.includes(recipient);
            if (!isWhitelisted) {
              const msg = `[${policy.name}] Recipient ${to} is not on your whitelist`;
              if (rule.action === 'BLOCK') { violations.push(msg); hardBlock = true; }
              else warnings.push(msg);
            }
            break;
          }

          case 'DAILY_SPEND_LIMIT': {
            const max = parseFloat(rule.params.dailyLimit ?? '99999');
            const ruleToken = (rule.params.token ?? 'ETH').toUpperCase();
            if (token.toUpperCase() === ruleToken) {
              const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
              const txs = await Transaction.find({ from: wallet, token: ruleToken, createdAt: { $gte: dayAgo } });
              const spent = txs.reduce((s, t) => s + parseFloat(t.amount), 0);
              if (spent + amountNum > max) {
                const msg = `[${policy.name}] Daily spend limit of ${max} ${ruleToken} would be exceeded (current: ${spent.toFixed(4)})`;
                if (rule.action === 'BLOCK') { violations.push(msg); hardBlock = true; }
                else warnings.push(msg);
              }
            }
            break;
          }

          case 'ALERT_NEW_ADDRESS': {
            const priorCount = await Transaction.countDocuments({
              from: wallet,
              to:   recipient,
            });
            if (priorCount === 0) {
              const msg = `[${policy.name}] First-time transaction to ${to}`;
              warnings.push(msg);
            }
            break;
          }

          case 'CUSTOM_ANOMALY_THRESHOLD': {
            // just flag — anomaly score computed elsewhere
            const threshold = parseInt(rule.params.threshold ?? '70');
            const msg = `[${policy.name}] Custom anomaly threshold monitoring active (alert at ${threshold}/100 risk)`;
            warnings.push(msg);
            break;
          }

          default:
            break;
        }
      }
    }

    res.json({
      success: true,
      data: {
        allowed:    !hardBlock,
        violations,
        warnings,
        policyCount: policies.length,
      },
    });
  })
);

export default router;
