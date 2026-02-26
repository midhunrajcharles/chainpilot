import { Types } from 'mongoose';

// Utility functions for the ChainPilot AI backend

export const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

export const generateObjectId = (): string => {
  return new Types.ObjectId().toString();
};

export const formatWalletAddress = (address: string): string => {
  return address.toLowerCase();
};

export const validateWalletAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const calculatePagination = (page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext,
    hasPrev
  };
};

export const formatDate = (date: Date): string => {
  return date.toISOString();
};

export const parseAmount = (amount: string): number => {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid amount');
  }
  return parsed;
};

export const formatAmount = (amount: number, decimals: number = 18): string => {
  return amount.toFixed(decimals);
};

export const generateTransactionId = (): string => {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const validateTokenSymbol = (token: string): boolean => {
  return /^[A-Z]{2,10}$/.test(token);
};

export const formatTokenSymbol = (token: string): string => {
  return token.toUpperCase();
};

export const calculateRiskScore = (factors: {
  transactionCount: number;
  totalVolume: number;
  lastSeen: Date;
  suspiciousActivity: boolean;
}): number => {
  let score = 0;

  // Transaction count factor (0-30 points)
  if (factors.transactionCount > 100) score += 30;
  else if (factors.transactionCount > 50) score += 20;
  else if (factors.transactionCount > 10) score += 10;

  // Volume factor (0-30 points)
  if (factors.totalVolume > 1000000) score += 30;
  else if (factors.totalVolume > 100000) score += 20;
  else if (factors.totalVolume > 10000) score += 10;

  // Recency factor (0-20 points)
  const daysSinceLastSeen = (Date.now() - factors.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastSeen < 7) score += 20;
  else if (daysSinceLastSeen < 30) score += 10;

  // Suspicious activity factor (0-20 points)
  if (!factors.suspiciousActivity) score += 20;

  return Math.min(score, 100);
};

export const generateQRCodeData = (data: any): string => {
  return JSON.stringify(data);
};

export const parseConditionalExpression = (condition: {
  type: string;
  operator: string;
  value: string;
  token?: string;
}): string => {
  const { type, operator, value, token } = condition;
  return `${type} ${operator} ${value}${token ? ` (${token})` : ''}`;
};

export const validateConditionalExpression = (condition: {
  type: string;
  operator: string;
  value: string;
  token?: string;
}): boolean => {
  const validTypes = ['price', 'time', 'balance'];
  const validOperators = ['>', '<', '>=', '<=', '=='];

  if (!validTypes.includes(condition.type)) return false;
  if (!validOperators.includes(condition.operator)) return false;
  if (isNaN(parseFloat(condition.value))) return false;
  if (condition.token && !validateTokenSymbol(condition.token)) return false;

  return true;
};

export const formatRecurringFrequency = (frequency: string): string => {
  const frequencies = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly'
  };
  return frequencies[frequency as keyof typeof frequencies] || frequency;
};

export const calculateNextScheduledDate = (frequency: string, lastDate: Date): Date => {
  const nextDate = new Date(lastDate);
  
  switch (frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      throw new Error('Invalid frequency');
  }
  
  return nextDate;
};

export const generateNotificationId = (): string => {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const formatNotificationType = (type: string): string => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const generateShareUrl = (transactionId: string): string => {
  const baseUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
  return `${baseUrl}/share/${transactionId}`;
};
