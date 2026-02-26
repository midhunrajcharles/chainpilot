/**
 * Monitoring Engine Service
 * Autonomous contract monitoring with cron jobs and event listeners
 */

import cron from 'node-cron';
import { ethers } from 'ethers';
import { analyzeContract } from '../contractAnalyzer';
import { generateRiskReport } from '../riskEngine';
import { explainAlert } from '../aiEngine';

export interface Monitor {
  id: string;
  userId: string;
  contractAddress: string;
  chainId: number;
  thresholds: MonitorThresholds;
  isActive: boolean;
  lastChecked?: Date;
  createdAt: Date;
  alertHistory: Alert[];
}

export interface MonitorThresholds {
  riskScoreIncrease?: number; // Alert if risk score increases by this amount
  liquidityChangePercent?: number; // Alert if liquidity changes by this %
  largeTransferAmount?: string; // Alert if transfer exceeds this amount
  checkIntervalMinutes: number; // How often to check (default: 5)
}

export interface Alert {
  id: string;
  monitorId: string;
  type: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: any;
  timestamp: Date;
  acknowledged: boolean;
}

export enum AlertType {
  RISK_SCORE_INCREASED = 'RISK_SCORE_INCREASED',
  NEW_VULNERABILITY = 'NEW_VULNERABILITY',
  LIQUIDITY_CHANGED = 'LIQUIDITY_CHANGED',
  LARGE_TRANSFER = 'LARGE_TRANSFER',
  CONTRACT_UPGRADED = 'CONTRACT_UPGRADED',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
}

// Active monitors store
const activeMonitors = new Map<string, Monitor>();
let cronJob: ReturnType<typeof cron.schedule> | null = null;

/**
 * Start monitoring engine (called on server startup)
 */
export function startMonitoringEngine() {
  if (cronJob) {
    console.log('Monitoring engine already running');
    return;
  }
  
  // Run every 5 minutes
  cronJob = cron.schedule('*/5 * * * *', async () => {
    console.log('Running monitoring checks...');
    await runMonitoringCycle();
  });
  
  console.log('✓ Monitoring engine started (runs every 5 minutes)');
}

/**
 * Stop monitoring engine
 */
export function stopMonitoringEngine() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('✓ Monitoring engine stopped');
  }
}

/**
 * Add monitor to active monitoring
 */
export function addMonitor(monitor: Monitor) {
  activeMonitors.set(monitor.id, monitor);
  console.log(`✓ Monitor added: ${monitor.id} for contract ${monitor.contractAddress}`);
}

/**
 * Remove monitor from active monitoring
 */
export function removeMonitor(monitorId: string) {
  activeMonitors.delete(monitorId);
  console.log(`✓ Monitor removed: ${monitorId}`);
}

/**
 * Get active monitor
 */
export function getMonitor(monitorId: string): Monitor | undefined {
  return activeMonitors.get(monitorId);
}

/**
 * Load monitors from database (called on startup)
 */
export async function loadActiveMonitors(
  fetchActiveMonitorsFromDb: () => Promise<Monitor[]>
) {
  try {
    const monitors = await fetchActiveMonitorsFromDb();
    
    for (const monitor of monitors) {
      if (monitor.isActive) {
        activeMonitors.set(monitor.id, monitor);
      }
    }
    
    console.log(`✓ Loaded ${activeMonitors.size} active monitors`);
  } catch (error: any) {
    console.error('Failed to load active monitors:', error.message);
  }
}

/**
 * Run monitoring cycle for all active monitors
 */
async function runMonitoringCycle() {
  const monitors = Array.from(activeMonitors.values());
  
  if (monitors.length === 0) {
    console.log('No active monitors to check');
    return;
  }
  
  console.log(`Checking ${monitors.length} active monitors...`);
  
  // Check monitors in parallel (batch of 5 at a time to avoid rate limiting)
  const batchSize = 5;
  for (let i = 0; i < monitors.length; i += batchSize) {
    const batch = monitors.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map((monitor) => checkMonitor(monitor).catch((error) => {
        console.error(`Monitor ${monitor.id} check failed:`, error.message);
      }))
    );
  }
  
  console.log('✓ Monitoring cycle complete');
}

/**
 * Check individual monitor
 */
async function checkMonitor(monitor: Monitor) {
  try {
    // Run contract analysis
    const analysisResult = await analyzeContract(
      monitor.contractAddress,
      monitor.chainId
    );
    
    const riskReport = generateRiskReport(analysisResult);
    
    // Check for risk score increase
    if (monitor.thresholds.riskScoreIncrease) {
      // Would need to compare with stored previous analysis
      // For now, alert on any high/critical risk
      if (riskReport.riskScore >= 70) {
        await triggerAlert(monitor, {
          type: AlertType.RISK_SCORE_INCREASED,
          severity: 'CRITICAL',
          message: `Risk score is CRITICAL: ${riskReport.riskScore}/100`,
          details: {
            riskScore: riskReport.riskScore,
            severity: riskReport.severity,
            findingsCount: riskReport.findings.length,
          },
        });
      }
    }
    
    // Check for new vulnerabilities
    if (riskReport.summary.criticalCount > 0) {
      await triggerAlert(monitor, {
        type: AlertType.NEW_VULNERABILITY,
        severity: 'HIGH',
        message: `${riskReport.summary.criticalCount} critical vulnerabilities detected`,
        details: {
          findings: riskReport.findings.slice(0, 3), // Top 3 findings
        },
      });
    }
    
    // Check for liquidity changes (requires additional RPC calls)
    if (monitor.thresholds.liquidityChangePercent) {
      const liquidityChange = await checkLiquidityChange(
        monitor.contractAddress,
        monitor.chainId
      );
      
      if (liquidityChange && Math.abs(liquidityChange.percentChange) > monitor.thresholds.liquidityChangePercent) {
        await triggerAlert(monitor, {
          type: AlertType.LIQUIDITY_CHANGED,
          severity: liquidityChange.percentChange < 0 ? 'HIGH' : 'MEDIUM',
          message: `Liquidity changed by ${liquidityChange.percentChange.toFixed(2)}%`,
          details: liquidityChange,
        });
      }
    }
    
    // Check for large transfers (requires event log scanning)
    if (monitor.thresholds.largeTransferAmount) {
      const largeTransfers = await checkLargeTransfers(
        monitor.contractAddress,
        monitor.chainId,
        monitor.thresholds.largeTransferAmount
      );
      
      if (largeTransfers.length > 0) {
        await triggerAlert(monitor, {
          type: AlertType.LARGE_TRANSFER,
          severity: 'MEDIUM',
          message: `${largeTransfers.length} large transfer(s) detected`,
          details: { transfers: largeTransfers },
        });
      }
    }
    
    // Update last checked time
    monitor.lastChecked = new Date();
    activeMonitors.set(monitor.id, monitor);
    
  } catch (error: any) {
    console.error(`Monitor check failed for ${monitor.contractAddress}:`, error.message);
  }
}

/**
 * Trigger alert and add to monitor history
 */
async function triggerAlert(
  monitor: Monitor,
  alertData: {
    type: AlertType;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    details: any;
  }
) {
  const alert: Alert = {
    id: generateAlertId(),
    monitorId: monitor.id,
    type: alertData.type,
    severity: alertData.severity,
    message: alertData.message,
    details: alertData.details,
    timestamp: new Date(),
    acknowledged: false,
  };
  
  monitor.alertHistory.push(alert);
  
  console.log(`🚨 Alert triggered: ${alert.message} for contract ${monitor.contractAddress}`);
  
  // Generate AI explanation for alert
  try {
    const aiExplanation = await explainAlert(
      monitor.contractAddress,
      alertData.type,
      alertData.message
    );
    alert.details.aiExplanation = aiExplanation;
  } catch (error) {
    console.error('Failed to generate AI explanation for alert');
  }
  
  // In production, would:
  // 1. Save alert to database
  // 2. Send push notification to user
  // 3. Send email if configured
  // 4. Trigger webhook if configured
  
  return alert;
}

/**
 * Check for liquidity changes (simplified)
 */
async function checkLiquidityChange(
  contractAddress: string,
  chainId: number
): Promise<{ percentChange: number; oldValue: string; newValue: string } | null> {
  try {
    // In production, would track liquidity over time and compare
    // For now, return null (not implemented)
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check for large transfers in recent blocks
 */
async function checkLargeTransfers(
  contractAddress: string,
  chainId: number,
  threshold: string
): Promise<any[]> {
  try {
    const rpcUrl = getRpcUrl(chainId);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Get recent blocks (last 100 blocks)
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 100;
    
    // ERC20 Transfer event signature
    const transferTopic = ethers.id('Transfer(address,address,uint256)');
    
    const logs = await provider.getLogs({
      address: contractAddress,
      topics: [transferTopic],
      fromBlock,
      toBlock: 'latest',
    });
    
    const thresholdBN = BigInt(threshold);
    const largeTransfers: any[] = [];
    
    for (const log of logs) {
      try {
        // Decode transfer amount (data field)
        const amount = BigInt(log.data);
        
        if (amount >= thresholdBN) {
          largeTransfers.push({
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            amount: amount.toString(),
            from: '0x' + log.topics[1].slice(26),
            to: '0x' + log.topics[2].slice(26),
          });
        }
      } catch (error) {
        // Skip invalid logs
      }
    }
    
    return largeTransfers;
  } catch (error: any) {
    console.error('Failed to check large transfers:', error.message);
    return [];
  }
}

/**
 * User-triggered immediate check
 */
export async function triggerImmediateCheck(
  monitorId: string
): Promise<{ success: boolean; alerts: Alert[] }> {
  const monitor = activeMonitors.get(monitorId);
  
  if (!monitor) {
    throw new Error('Monitor not found');
  }
  
  const alertsBefore = monitor.alertHistory.length;
  
  await checkMonitor(monitor);
  
  const newAlerts = monitor.alertHistory.slice(alertsBefore);
  
  return {
    success: true,
    alerts: newAlerts,
  };
}

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Get RPC URL for chain
 */
function getRpcUrl(chainId: number): string {
  const RPC_URLS: Record<number, string> = {
    11155111: process.env.SOMNIA_RPC_URL || 'https://rpc.sepolia.org',
    1: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    137: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
  };
  
  return RPC_URLS[chainId] || RPC_URLS[11155111];
}
