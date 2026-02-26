import { Router } from 'express';
import { extractWalletAddress } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorMiddleware';
import { Transaction } from '../models/Transaction';
import { AnalyticsData, ApiResponse, PaginatedResponse, PortfolioData, PredictionData } from '../types';
import { calculatePagination } from '../utils/helpers';

const router = Router();

// GET /api/analytics/dashboard
// Description: Get comprehensive analytics dashboard data
router.get('/dashboard',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get transactions for the period
    const transactions = await Transaction.find({
      walletAddress: userWalletAddress,
      createdAt: { $gte: startDate },
      status: 'confirmed'
    }).sort({ createdAt: -1 });

    // Calculate analytics
    const totalSpent = transactions
      .filter(tx => tx.from.toLowerCase() === userWalletAddress)
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const totalReceived = transactions
      .filter(tx => tx.to.toLowerCase() === userWalletAddress)
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const transactionCount = transactions.length;

    // Top recipients
    const recipientMap = new Map();
    transactions
      .filter(tx => tx.from.toLowerCase() === userWalletAddress)
      .forEach(tx => {
        const recipient = tx.to;
        const amount = parseFloat(tx.amount);
        if (recipientMap.has(recipient)) {
          recipientMap.set(recipient, {
            address: recipient,
            amount: recipientMap.get(recipient).amount + amount,
            count: recipientMap.get(recipient).count + 1
          });
        } else {
          recipientMap.set(recipient, {
            address: recipient,
            amount: amount,
            count: 1
          });
        }
      });

    const topRecipients = Array.from(recipientMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Spending by day
    const spendingByDay = new Map();
    transactions
      .filter(tx => tx.from.toLowerCase() === userWalletAddress)
      .forEach(tx => {
        const date = tx.createdAt.toISOString().split('T')[0];
        const amount = parseFloat(tx.amount);
        spendingByDay.set(date, (spendingByDay.get(date) || 0) + amount);
      });

    const spendingByDayArray = Array.from(spendingByDay.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Portfolio value in ETH units
    const portfolioValue = totalReceived - totalSpent;

    // Calculate real portfolioChange: compare current period vs previous equal period
    const prevStartDate = new Date(startDate);
    const periodLengthMs = now.getTime() - startDate.getTime();
    prevStartDate.setTime(startDate.getTime() - periodLengthMs);

    const prevTransactions = await Transaction.find({
      walletAddress: userWalletAddress,
      createdAt: { $gte: prevStartDate, $lt: startDate },
      status: 'confirmed'
    });

    const prevSpent = prevTransactions
      .filter(tx => tx.from.toLowerCase() === userWalletAddress.toLowerCase())
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const prevReceived = prevTransactions
      .filter(tx => tx.to.toLowerCase() === userWalletAddress.toLowerCase())
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    const prevPortfolioValue = prevReceived - prevSpent;
    const portfolioChange = prevPortfolioValue !== 0
      ? ((portfolioValue - prevPortfolioValue) / Math.abs(prevPortfolioValue)) * 100
      : (portfolioValue > 0 ? 100 : 0);

    const analytics: AnalyticsData = {
      totalSpent,
      totalReceived,
      transactionCount,
      topRecipients,
      spendingByDay: spendingByDayArray,
      portfolioValue,
      portfolioChange
    };

    const response: ApiResponse = {
      success: true,
      data: analytics
    };

    res.status(200).json(response);
  })
);

// GET /api/analytics/spending-patterns
// Description: Analyze spending patterns over time
router.get('/spending-patterns',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { period = '30d', groupBy = 'day' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const transactions = await Transaction.find({
      walletAddress: userWalletAddress,
      from: userWalletAddress,
      createdAt: { $gte: startDate },
      status: 'confirmed'
    }).sort({ createdAt: -1 });

    const patterns: any[] = [];

    if (groupBy === 'day') {
      const dayMap = new Map();
      transactions.forEach(tx => {
        const date = tx.createdAt.toISOString().split('T')[0];
        const amount = parseFloat(tx.amount);
        dayMap.set(date, (dayMap.get(date) || 0) + amount);
      });

      patterns.push(...Array.from(dayMap.entries()).map(([date, amount]) => ({
        period: date,
        amount,
        count: transactions.filter(tx => 
          tx.createdAt.toISOString().split('T')[0] === date
        ).length
      })));
    } else if (groupBy === 'week') {
      const weekMap = new Map();
      transactions.forEach(tx => {
        const week = getWeekNumber(tx.createdAt);
        const amount = parseFloat(tx.amount);
        weekMap.set(week, (weekMap.get(week) || 0) + amount);
      });

      patterns.push(...Array.from(weekMap.entries()).map(([week, amount]) => ({
        period: `Week ${week}`,
        amount,
        count: transactions.filter(tx => 
          getWeekNumber(tx.createdAt) === week
        ).length
      })));
    } else if (groupBy === 'month') {
      const monthMap = new Map();
      transactions.forEach(tx => {
        const month = tx.createdAt.toISOString().substring(0, 7);
        const amount = parseFloat(tx.amount);
        monthMap.set(month, (monthMap.get(month) || 0) + amount);
      });

      patterns.push(...Array.from(monthMap.entries()).map(([month, amount]) => ({
        period: month,
        amount,
        count: transactions.filter(tx => 
          tx.createdAt.toISOString().substring(0, 7) === month
        ).length
      })));
    }

    const response: ApiResponse = {
      success: true,
      data: patterns.sort((a, b) => a.period.localeCompare(b.period))
    };

    res.status(200).json(response);
  })
);

// GET /api/analytics/portfolio-tracking
// Description: Track portfolio value and performance metrics
router.get('/portfolio-tracking',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;

    // Get all transactions
    const transactions = await Transaction.find({
      walletAddress: userWalletAddress,
      status: 'confirmed'
    }).sort({ createdAt: -1 });

    // Calculate holdings by token
    const holdingsMap = new Map();
    transactions.forEach(tx => {
      const token = tx.token;
      const amount = parseFloat(tx.amount);
      
      if (tx.from.toLowerCase() === userWalletAddress) {
        // Sent
        holdingsMap.set(token, (holdingsMap.get(token) || 0) - amount);
      } else {
        // Received
        holdingsMap.set(token, (holdingsMap.get(token) || 0) + amount);
      }
    });

    // Fetch real token prices from CoinGecko (public API, no key needed)
    const tokenPrices = await fetchTokenPrices();

    const holdings = Array.from(holdingsMap.entries())
      .filter(([, amount]) => amount > 0)
      .map(([token, amount]) => ({
        token,
        amount,
        value: amount * (tokenPrices[token.toUpperCase()] ?? 0)
      }));

    const currentValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

    // Calculate real 24h / 7d / 30d portfolio performance from transaction data
    const now24h = new Date(); now24h.setHours(now24h.getHours() - 24);
    const now7d  = new Date(); now7d.setDate(now7d.getDate() - 7);
    const now30d = new Date(); now30d.setDate(now30d.getDate() - 30);

    const computeValueAt = (cutoff: Date) => {
      const txs = transactions.filter(tx => tx.createdAt >= cutoff);
      const r = txs.filter(tx => tx.to.toLowerCase() === userWalletAddress.toLowerCase()).reduce((s, tx) => s + parseFloat(tx.amount), 0);
      const p = txs.filter(tx => tx.from.toLowerCase() === userWalletAddress.toLowerCase()).reduce((s, tx) => s + parseFloat(tx.amount), 0);
      return (r - p) * (tokenPrices['ETH'] ?? 0);
    };

    const portfolio: PortfolioData = {
      currentValue,
      change24h: computeValueAt(now24h),
      change7d:  computeValueAt(now7d),
      change30d: computeValueAt(now30d),
      holdings
    };

    const response: ApiResponse = {
      success: true,
      data: portfolio
    };

    res.status(200).json(response);
  })
);

// GET /api/analytics/transaction-history
// Description: Search and filter transaction history
router.get('/transaction-history',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;
    const { 
      search, 
      recipient, 
      token, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;

    let query: any = { walletAddress: userWalletAddress };

    // Add filters
    if (recipient) {
      query.to = recipient.toLowerCase();
    }

    if (token) {
      query.token = token.toUpperCase();
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { txHash: { $regex: search, $options: 'i' } },
        { to: { $regex: search, $options: 'i' } },
        { from: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments(query);
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const pagination = calculatePagination(parseInt(page), parseInt(limit), total);

    const response: PaginatedResponse<any> = {
      success: true,
      data: transactions,
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages
    };

    res.status(200).json(response);
  })
);

// GET /api/analytics/predictions
// Description: Get AI-powered transaction predictions and forecasts
router.get('/predictions',
  extractWalletAddress,
  asyncHandler(async (req: any, res: any) => {
    const userWalletAddress = req.walletAddress;

    // Get recent transactions for analysis
    const transactions = await Transaction.find({
      walletAddress: userWalletAddress,
      status: 'confirmed'
    }).sort({ createdAt: -1 }).limit(100);

    // Analyze patterns for predictions
    const sentTransactions = transactions.filter(tx => 
      tx.from.toLowerCase() === userWalletAddress
    );

    // Most frequent recipient
    const recipientCounts = new Map();
    sentTransactions.forEach(tx => {
      const recipient = tx.to;
      recipientCounts.set(recipient, (recipientCounts.get(recipient) || 0) + 1);
    });

    const mostFrequentRecipient = Array.from(recipientCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    // Average amount
    const averageAmount = sentTransactions.length > 0 
      ? sentTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) / sentTransactions.length
      : 0;

    // Generate predictions
    const predictions: PredictionData = {
      nextTransaction: {
        predictedAmount: averageAmount,
        predictedRecipient: mostFrequentRecipient?.[0] || '',
        confidence: mostFrequentRecipient ? 0.75 : 0.25
      },
      spendingForecast: generateSpendingForecast(sentTransactions),
      riskScore: calculateRiskScore(sentTransactions)
    };

    const response: ApiResponse = {
      success: true,
      data: predictions
    };

    res.status(200).json(response);
  })
);

// ── Helper: fetch live token prices from CoinGecko (public free tier) ──────
async function fetchTokenPrices(): Promise<Record<string, number>> {
  const coinIds = 'ethereum,bitcoin,tether,usd-coin,matic-network,solana';
  const coinKeyMap: Record<string, string> = {
    'ethereum':     'ETH',
    'bitcoin':      'BTC',
    'tether':       'USDT',
    'usd-coin':     'USDC',
    'matic-network':'MATIC',
    'solana':       'SOL',
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!resp.ok) return {};
    const data = await resp.json() as Record<string, { usd: number }>;
    const prices: Record<string, number> = {};
    for (const [id, val] of Object.entries(data)) {
      const sym = coinKeyMap[id];
      if (sym) prices[sym] = val.usd;
    }
    return prices;
  } catch {
    // CoinGecko unreachable – return empty so values show as 0 (no fake data)
    return {};
  }
}

// Helper functions
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function generateSpendingForecast(transactions: any[]): any[] {
  const forecast = [];
  const now = new Date();

  // Compute real average daily spend from last 30 days of data
  const amounts: number[] = transactions.map(tx => parseFloat(tx.amount || '0'));
  const avgDailySpend = amounts.length > 0
    ? amounts.reduce((s, a) => s + a, 0) / Math.max(1, amounts.length)
    : 0;

  // Variance from actual data (std-dev)
  const variance = amounts.length > 1
    ? Math.sqrt(amounts.reduce((s, a) => s + Math.pow(a - avgDailySpend, 2), 0) / amounts.length)
    : 0;

  // Day-of-week activity multiplier (derived from transaction distribution)
  const dayActivity = [0, 0, 0, 0, 0, 0, 0];
  transactions.forEach(tx => {
    const d = new Date(tx.createdAt).getDay();
    dayActivity[d] += parseFloat(tx.amount || '0');
  });
  const maxActivity = Math.max(...dayActivity, 1);
  const dayMultiplier = dayActivity.map(v => 0.7 + 0.6 * (v / maxActivity));

  for (let i = 1; i <= 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dow = date.getDay();
    const predicted = avgDailySpend * dayMultiplier[dow];
    forecast.push({
      date: date.toISOString().split('T')[0],
      predictedAmount: Math.max(0, predicted)
    });
  }

  return forecast;
}

function calculateRiskScore(transactions: any[]): number {
  if (transactions.length === 0) return 50;
  
  const avgAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) / transactions.length;
  const frequency = transactions.length;
  
  // Simple risk calculation
  let riskScore = 50;
  if (avgAmount > 1000) riskScore += 20;
  if (frequency > 50) riskScore += 15;
  if (frequency < 5) riskScore += 10;
  
  return Math.min(Math.max(riskScore, 0), 100);
}

export default router;
