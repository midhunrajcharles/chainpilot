import cron from 'node-cron';
import { ethers } from 'ethers';
import { ScheduledTransaction } from '../../models/ScheduledTransaction';
import { calculateNextScheduledDate } from '../../utils/helpers';

let cronJob: ReturnType<typeof cron.schedule> | null = null;

function getExecutorIntervalCron(): string {
  const seconds = Number(process.env.SCHEDULED_EXECUTOR_INTERVAL_SECONDS || 30);

  if (!Number.isFinite(seconds) || seconds < 5) {
    return '*/30 * * * * *';
  }

  if (seconds >= 60) {
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `*/${minutes} * * * *`;
  }

  return `*/${Math.round(seconds)} * * * * *`;
}

function getRpcCandidates(): string[] {
  const rawCandidates = [
    process.env.SCHEDULED_EXECUTOR_RPC_URL,
    process.env.SOMNIA_RPC_URL,
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.drpc.org',
    'https://rpc.ankr.com/eth_sepolia',
    'https://rpc.sepolia.org',
  ];

  return Array.from(new Set(rawCandidates.filter((value): value is string => !!value && value.trim().length > 0)));
}

function isExecutorEnabled(): boolean {
  const raw = (process.env.SCHEDULED_EXECUTOR_ENABLED || 'true').toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

async function getSigner(): Promise<ethers.Wallet | null> {
  const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }

  const rpcCandidates = getRpcCandidates();

  for (const rpcUrl of rpcCandidates) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      await provider.getBlockNumber();
      console.log(`✓ Scheduled executor using RPC: ${rpcUrl}`);
      return new ethers.Wallet(privateKey, provider);
    } catch {
      continue;
    }
  }

  throw new Error('No healthy RPC endpoint available for scheduled executor');
}

async function executeDueTransaction(txId: string, signer: ethers.Wallet) {
  const claimed = await ScheduledTransaction.findOneAndUpdate(
    {
      _id: txId,
      status: 'scheduled',
      processing: { $ne: true },
      scheduledFor: { $lte: new Date() },
    },
    {
      $set: {
        processing: true,
        processingStartedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!claimed) {
    return;
  }

  try {
    if (claimed.token !== 'ETH') {
      throw new Error(`Auto executor currently supports ETH only. Received token: ${claimed.token}`);
    }

    const txResponse = await signer.sendTransaction({
      to: claimed.recipient,
      value: ethers.parseEther(claimed.amount),
    });

    await txResponse.wait();

    claimed.status = 'sent';
    claimed.executedAt = new Date();
    claimed.executionTxHash = txResponse.hash;
    claimed.processing = false;
    claimed.processingStartedAt = undefined;
    await claimed.save();

    if (claimed.recurring?.frequency) {
      const nextDate = calculateNextScheduledDate(
        claimed.recurring.frequency,
        claimed.scheduledFor
      );

      const hasEndDate = !!claimed.recurring.endDate;
      const withinEndDate = !hasEndDate || nextDate <= new Date(claimed.recurring.endDate as Date);

      if (withinEndDate) {
        const nextScheduledTransaction = new ScheduledTransaction({
          walletAddress: claimed.walletAddress,
          amount: claimed.amount,
          token: claimed.token,
          recipient: claimed.recipient,
          scheduledFor: nextDate,
          recurring: claimed.recurring,
          status: 'scheduled',
          processing: false,
        });

        await nextScheduledTransaction.save();
      }
    }

    console.log(`✅ Auto sent scheduled transaction: ${claimed._id.toString()} -> ${txResponse.hash}`);
  } catch (error: any) {
    await ScheduledTransaction.updateOne(
      { _id: claimed._id },
      {
        $set: {
          processing: false,
        },
        $unset: {
          processingStartedAt: 1,
        },
      }
    );

    console.error(`⚠️ Failed auto execution for scheduled tx ${claimed._id.toString()}:`, error.message);
  }
}

async function runScheduledExecutionCycle() {
  const signer = await getSigner();
  if (!signer) {
    return;
  }

  const dueTransactions = await ScheduledTransaction.find({
    status: 'scheduled',
    processing: { $ne: true },
    scheduledFor: { $lte: new Date() },
  })
    .sort({ scheduledFor: 1 })
    .limit(20)
    .select('_id');

  if (dueTransactions.length === 0) {
    return;
  }

  for (const dueTx of dueTransactions) {
    await executeDueTransaction(dueTx._id.toString(), signer);
  }
}

export function startScheduledExecutor() {
  if (!isExecutorEnabled()) {
    console.log('ℹ️ Scheduled auto executor disabled by env');
    return;
  }

  if (!process.env.BACKEND_WALLET_PRIVATE_KEY) {
    console.warn('⚠️ Scheduled auto executor not started: BACKEND_WALLET_PRIVATE_KEY is missing');
    return;
  }

  if (cronJob) {
    console.log('Scheduled auto executor already running');
    return;
  }

  const cronExpression = getExecutorIntervalCron();
  cronJob = cron.schedule(cronExpression, async () => {
    try {
      await runScheduledExecutionCycle();
    } catch (error: any) {
      console.error('⚠️ Scheduled auto executor cycle failed:', error.message);
    }
  });

  console.log(`✓ Scheduled auto executor started (${cronExpression})`);
}

export function stopScheduledExecutor() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('✓ Scheduled auto executor stopped');
  }
}
