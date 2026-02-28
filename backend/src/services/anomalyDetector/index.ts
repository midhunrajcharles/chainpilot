/**
 * Proactive Anomaly Detection Engine
 *
 * Analyses wallet transaction patterns proactively — before a transaction is
 * confirmed — to surface unusual activity, potential threats and risk signals.
 *
 * Detectors run on-demand (per-request) and on a scheduled cron cycle.
 */

import { Transaction } from '../../models/Transaction';
import { AnomalyEvent, AnomalyType, AnomalySeverity, IAnomalyEvent } from '../../models/AnomalyEvent';
import { ethers } from 'ethers';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface AnomalyScanResult {
  walletAddress: string;
  scannedAt: Date;
  anomaliesFound: number;
  newAnomaliesFound: number;
  anomalies: IAnomalyEvent[];
  transactionsAnalyzed: number;
  dataSources: {
    dbTransactions: number;
    onchainTransactions: number;
  };
  overallRisk: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
}

export interface SavedAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  confidence: number;
  riskScore: number;
  details: Record<string, any>;
  relatedTxHashes: string[];
  relatedAddresses: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// Main scanner
// ────────────────────────────────────────────────────────────────────────────

/**
 * Run a full anomaly scan for `walletAddress`.
 * Newly detected anomalies are persisted to MongoDB.
 */
export async function runAnomalyScan(walletAddress: string): Promise<AnomalyScanResult> {
  const wallet = walletAddress.toLowerCase();

  // Fetch last 500 app-recorded transactions involving this wallet
  const dbTxs = await Transaction.find({
    $or: [{ from: wallet }, { to: wallet }],
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  // Fetch recent live on-chain transactions involving this wallet
  const chainTxs = await fetchRecentOnchainTransactions(wallet);

  // Merge + dedupe + normalize for detector engine
  const txs = mergeAndNormalizeTransactions(dbTxs, chainTxs);

  const detected: SavedAnomaly[] = [];

  // Run each detector
  const detectors = [
    detectUnusualVolume,
    detectRapidBurst,
    detectDormantActivation,
    detectCircularPattern,
    detectFailedTxCluster,
    detectAfterHoursActivity,
  ];

  for (const detector of detectors) {
    try {
      const result = await detector(wallet, txs);
      if (result) detected.push(result);
    } catch (_) {
      // individual detector failure should not abort the scan
    }
  }

  // Persist new anomalies (deduplicate by type within the last 24 h)
  const now = Date.now();
  const cutoff = new Date(now - 24 * 60 * 60 * 1000);
  const persistedAnomalies: IAnomalyEvent[] = [];
  let newlyCreatedCount = 0;

  for (const anomaly of detected) {
    const existing = await AnomalyEvent.findOne({
      walletAddress: wallet,
      type: anomaly.type,
      createdAt: { $gte: cutoff },
    });

    if (!existing) {
      const doc = await AnomalyEvent.create({ walletAddress: wallet, ...anomaly });
      persistedAnomalies.push(doc);
      newlyCreatedCount++;
    } else {
      persistedAnomalies.push(existing);
    }
  }

  const overallRisk = computeOverallRisk(detected);

  return {
    walletAddress: wallet,
    scannedAt: new Date(),
    anomaliesFound: detected.length,
    newAnomaliesFound: newlyCreatedCount,
    anomalies: persistedAnomalies,
    transactionsAnalyzed: txs.length,
    dataSources: {
      dbTransactions: dbTxs.length,
      onchainTransactions: chainTxs.length,
    },
    overallRisk,
    summary: buildSummary(detected, overallRisk),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Pre-transaction check (synchronous policy check before user sends)
// ────────────────────────────────────────────────────────────────────────────

export interface PreTxCheckResult {
  safe: boolean;
  riskScore: number;
  flags: string[];
  recommendation: string;
}

export async function checkPreTransaction(
  from: string,
  to: string,
  amount: string,
  token: string
): Promise<PreTxCheckResult> {
  const wallet = from.toLowerCase();
  const recipient = to.toLowerCase();
  const amountNum = parseFloat(amount) || 0;

  const flags: string[] = [];
  let riskScore = 0;

  // 1. High value check
  if (token === 'ETH' && amountNum > 5) {
    flags.push(`High-value transfer: ${amountNum} ETH`);
    riskScore += 20;
  }

  // 2. Check if recipient is a first-time address
  const fromCount = await Transaction.countDocuments({ from: wallet, to: recipient });
  const toCount   = await Transaction.countDocuments({ to: wallet, from: recipient });
  if (fromCount === 0 && toCount === 0) {
    flags.push('First-time recipient — no prior interaction history');
    riskScore += 15;
  }

  // 3. Check for rapid burst in last hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await Transaction.countDocuments({
    from: wallet,
    createdAt: { $gte: hourAgo },
  });
  if (recentCount >= 10) {
    flags.push(`Rapid activity: ${recentCount} transactions in the last hour`);
    riskScore += 25;
  }

  // 4. Known-bad pattern: sending to yourself
  if (wallet === recipient) {
    flags.push('Recipient is sender — possible test or error');
    riskScore += 10;
  }

  const safe = riskScore < 40;
  return {
    safe,
    riskScore: Math.min(riskScore, 100),
    flags,
    recommendation: safe
      ? 'Transaction looks normal. Proceed with care.'
      : 'Elevated risk detected. Please verify the recipient and amount carefully.',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Individual detectors
// ────────────────────────────────────────────────────────────────────────────

async function detectUnusualVolume(wallet: string, txs: any[]): Promise<SavedAnomaly | null> {
  const last7Days = txs.filter(
    (tx) => tx.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  const prev7Days = txs.filter(
    (tx) =>
      tx.createdAt > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
      tx.createdAt <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  if (last7Days.length < 2 || prev7Days.length === 0) return null;

  const recent = last7Days.reduce((s, t) => s + parseFloat(t.amount), 0);
  const previous = prev7Days.reduce((s, t) => s + parseFloat(t.amount), 0);

  if (previous === 0 || recent < previous * 3) return null;

  const multiplier = (recent / previous).toFixed(1);
  return {
    type: 'UNUSUAL_TRANSFER_VOLUME',
    severity: recent > previous * 10 ? 'CRITICAL' : 'HIGH',
    title: 'Unusual Transfer Volume',
    description: `Transfer volume this week is ${multiplier}× higher than the previous week.`,
    confidence: 80,
    riskScore: Math.min(30 + Math.floor(recent / previous) * 5, 80),
    details: { recentVolume: recent.toFixed(4), previousVolume: previous.toFixed(4), multiplier },
    relatedTxHashes: last7Days.slice(0, 5).map((t) => t.txHash).filter(Boolean),
    relatedAddresses: [],
  };
}

async function detectRapidBurst(wallet: string, txs: any[]): Promise<SavedAnomaly | null> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const burst = txs.filter((tx) => tx.createdAt > hourAgo);
  if (burst.length < 8) return null;

  return {
    type: 'RAPID_TRANSACTION_BURST',
    severity: burst.length >= 20 ? 'CRITICAL' : burst.length >= 15 ? 'HIGH' : 'MEDIUM',
    title: 'Rapid Transaction Burst',
    description: `${burst.length} transactions detected in the last hour — possible automated activity or attack.`,
    confidence: 85,
    riskScore: Math.min(40 + burst.length * 2, 90),
    details: { count: burst.length, window: '1 hour' },
    relatedTxHashes: burst.slice(0, 5).map((t) => t.txHash).filter(Boolean),
    relatedAddresses: [...new Set(burst.map((t) => t.to).filter(Boolean))].slice(0, 5),
  };
}

async function detectDormantActivation(wallet: string, txs: any[]): Promise<SavedAnomaly | null> {
  if (txs.length < 2) return null;

  const sorted = [...txs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const latest = new Date(sorted[sorted.length - 1].createdAt);
  const secondLatest = new Date(sorted[sorted.length - 2].createdAt);
  const gapDays = (latest.getTime() - secondLatest.getTime()) / (1000 * 60 * 60 * 24);

  if (gapDays < 90) return null;

  return {
    type: 'DORMANT_WALLET_ACTIVATED',
    severity: 'MEDIUM',
    title: 'Dormant Wallet Re-activated',
    description: `Wallet was inactive for ${Math.floor(gapDays)} days and recently became active.`,
    confidence: 90,
    riskScore: 35,
    details: { dormantDays: Math.floor(gapDays), lastActiveBefore: secondLatest.toISOString() },
    relatedTxHashes: sorted.slice(-3).map((t) => t.txHash).filter(Boolean),
    relatedAddresses: [],
  };
}

async function detectCircularPattern(wallet: string, txs: any[]): Promise<SavedAnomaly | null> {
  // Detect A → B → A patterns within 24 hours (possible wash trading / money laundering signal)
  const recent = txs.filter((tx) => tx.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000));
  const outgoing = recent.filter((tx) => tx.from?.toLowerCase() === wallet);
  const incoming = recent.filter((tx) => tx.to?.toLowerCase() === wallet);

  const outRecipients = new Set(outgoing.map((t) => t.to?.toLowerCase()));
  const inSenders    = new Set(incoming.map((t) => t.from?.toLowerCase()));

  const circular = [...outRecipients].filter((addr) => inSenders.has(addr));
  if (circular.length === 0) return null;

  return {
    type: 'CIRCULAR_TRANSFER_PATTERN',
    severity: 'MEDIUM',
    title: 'Circular Transfer Pattern',
    description: `Funds were sent to and received back from ${circular.length} address(es) within 24 hours.`,
    confidence: 70,
    riskScore: 50,
    details: { circularAddresses: circular.slice(0, 5) },
    relatedTxHashes: [],
    relatedAddresses: circular.slice(0, 5),
  };
}

async function detectFailedTxCluster(wallet: string, txs: any[]): Promise<SavedAnomaly | null> {
  const recent = txs.filter((tx) => tx.createdAt > new Date(Date.now() - 2 * 60 * 60 * 1000));
  const failed = recent.filter((tx) => tx.status === 'failed');
  if (failed.length < 4) return null;

  return {
    type: 'FAILED_TX_CLUSTER',
    severity: 'MEDIUM',
    title: 'Cluster of Failed Transactions',
    description: `${failed.length} transactions failed in the last 2 hours — possible misconfiguration or spam attack.`,
    confidence: 80,
    riskScore: 40,
    details: { failedCount: failed.length, totalRecent: recent.length },
    relatedTxHashes: failed.slice(0, 5).map((t) => t.txHash).filter(Boolean),
    relatedAddresses: [],
  };
}

async function detectAfterHoursActivity(wallet: string, txs: any[]): Promise<SavedAnomaly | null> {
  const recent = txs.filter((tx) => tx.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000));
  const afterHours = recent.filter((tx) => {
    const h = new Date(tx.createdAt).getUTCHours();
    return h >= 1 && h <= 5; // 1–5 AM UTC
  });

  if (afterHours.length < 3) return null;

  return {
    type: 'AFTER_HOURS_ACTIVITY',
    severity: 'LOW',
    title: 'Unusual After-Hours Activity',
    description: `${afterHours.length} transactions detected between 1–5 AM UTC — worth reviewing.`,
    confidence: 60,
    riskScore: 25,
    details: { count: afterHours.length },
    relatedTxHashes: afterHours.slice(0, 3).map((t) => t.txHash).filter(Boolean),
    relatedAddresses: [],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Live chain ingestion
// ────────────────────────────────────────────────────────────────────────────

type NormalizedTx = {
  from: string;
  to: string;
  amount: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
};

function getAnomalyRpcUrl(): string {
  return (
    process.env.SOMNIA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ||
    'https://rpc.sepolia.org'
  );
}

async function fetchRecentOnchainTransactions(wallet: string): Promise<NormalizedTx[]> {
  const blockRange = Math.max(50, parseInt(process.env.ANOMALY_SCAN_BLOCK_RANGE || '300', 10));

  try {
    const provider = new ethers.JsonRpcProvider(getAnomalyRpcUrl());
    const latestBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, latestBlock - blockRange);
    const matches: NormalizedTx[] = [];

    for (let blockNumber = latestBlock; blockNumber >= startBlock; blockNumber--) {
      const block = await provider.getBlock(blockNumber, true);
      if (!block || !block.transactions || block.transactions.length === 0) continue;

      const timestamp = new Date(Number(block.timestamp) * 1000);

      for (const tx of block.transactions as any[]) {
        if (typeof tx === 'string') continue;

        const from = tx?.from?.toLowerCase?.() || '';
        const to = tx?.to?.toLowerCase?.() || '';
        if (from !== wallet && to !== wallet) continue;

        let status: 'pending' | 'confirmed' | 'failed' = 'confirmed';
        try {
          const receipt = await provider.getTransactionReceipt(String(tx.hash));
          if (receipt && receipt.status === 0) {
            status = 'failed';
          }
        } catch {
          status = 'confirmed';
        }

        matches.push({
          from,
          to,
          amount: ethers.formatEther(tx.value || 0n),
          txHash: String(tx.hash).toLowerCase(),
          status,
          createdAt: timestamp,
        });

        if (matches.length >= 500) {
          return matches;
        }
      }
    }

    return matches;
  } catch (error) {
    console.error('Live on-chain anomaly fetch failed, falling back to DB-only scan:', error);
    return [];
  }
}

function mergeAndNormalizeTransactions(dbTxs: any[], chainTxs: NormalizedTx[]): NormalizedTx[] {
  const fromDb: NormalizedTx[] = dbTxs.map((tx) => ({
    from: String(tx.from || '').toLowerCase(),
    to: String(tx.to || '').toLowerCase(),
    amount: String(tx.amount || '0'),
    txHash: String(tx.txHash || '').toLowerCase(),
    status: (tx.status || 'confirmed') as 'pending' | 'confirmed' | 'failed',
    createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date(),
  }));

  const byHash = new Map<string, NormalizedTx>();
  for (const tx of [...chainTxs, ...fromDb]) {
    if (!tx.txHash) continue;
    if (!byHash.has(tx.txHash)) {
      byHash.set(tx.txHash, tx);
    }
  }

  return Array.from(byHash.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 500);
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function computeOverallRisk(
  anomalies: SavedAnomaly[]
): 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (anomalies.length === 0) return 'SAFE';
  if (anomalies.some((a) => a.severity === 'CRITICAL')) return 'CRITICAL';
  if (anomalies.some((a) => a.severity === 'HIGH')) return 'HIGH';
  if (anomalies.some((a) => a.severity === 'MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

function buildSummary(
  anomalies: SavedAnomaly[],
  overallRisk: string
): string {
  if (anomalies.length === 0) return 'No anomalies detected. Wallet activity looks normal.';
  const titles = anomalies.map((a) => a.title).join(', ');
  return `${overallRisk} risk profile. ${anomalies.length} anomaly(ies) detected: ${titles}.`;
}
