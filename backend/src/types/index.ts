import { Request } from 'express';
import { Document, Types } from 'mongoose';

// Base interfaces
export interface IUser extends Document {
  _id: Types.ObjectId;
  walletAddress: string;
  name?: string;
  preferences: object;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContact extends Document {
  _id: Types.ObjectId;
  walletAddress: string;
  name: string;
  address: string;
  group: string;
  verified: boolean;
  reputation: object;
  createdAt: Date;
}

export interface ITeamMember {
  walletAddress: string;
  name: string;
  joinedAt: Date;
}

export interface ITeam extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  ownerWalletAddress: string;
  members: ITeamMember[];
  settings: object;
  createdAt: Date;
}

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  walletAddress: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed: string;
  createdAt: Date;
}

export interface IConditionalTransaction extends Document {
  _id: Types.ObjectId;
  walletAddress: string;
  amount: string;
  token: string;
  recipient: string;
  condition: {
    type: 'price' | 'time' | 'balance';
    operator: '>' | '<' | '>=' | '<=' | '==';
    value: string;
    token?: string;
  };
  status: 'active' | 'executed' | 'cancelled';
  createdAt: Date;
}

export interface IScheduledTransaction extends Document {
  _id: Types.ObjectId;
  walletAddress: string;
  amount: string;
  token: string;
  recipient: string;
  scheduledFor: Date;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    endDate?: Date;
  };
  status: 'scheduled' | 'executed' | 'cancelled';
  createdAt: Date;
}

export interface IApproval {
  walletAddress: string;
  action: 'approve' | 'reject';
  signature: string;
  timestamp: Date;
}

export interface ITeamTransaction extends Document {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  walletAddress: string;
  amount: string;
  token: string;
  recipients: string[];
  requiresApproval: boolean;
  approvals: IApproval[];
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: Date;
}

export interface IQueuedTransaction extends Document {
  _id: Types.ObjectId;
  walletAddress: string;
  amount: string;
  token: string;
  recipient: string;
  scheduledFor?: Date;
  status: 'queued' | 'synced' | 'failed';
  createdAt: Date;
}

export interface INotification extends Document {
  _id: Types.ObjectId;
  walletAddress: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: object;
  createdAt: Date;
}

export interface INotificationSubscription extends Document {
  _id: Types.ObjectId;
  walletAddress: string;
  type: 'email' | 'push' | 'sms';
  endpoint?: string;
  events: string[];
  active: boolean;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Request types
export interface AuthenticatedRequest extends Request {
  walletAddress?: string;
  user?: any;
}

// Analytics types
export interface AnalyticsData {
  totalSpent: number;
  totalReceived: number;
  transactionCount: number;
  topRecipients: Array<{
    address: string;
    amount: number;
    count: number;
  }>;
  spendingByDay: Array<{
    date: string;
    amount: number;
  }>;
  portfolioValue: number;
  portfolioChange: number;
}

export interface PortfolioData {
  currentValue: number;
  change24h: number;
  change7d: number;
  change30d: number;
  holdings: Array<{
    token: string;
    amount: number;
    value: number;
  }>;
}

export interface PredictionData {
  nextTransaction: {
    predictedAmount: number;
    predictedRecipient: string;
    confidence: number;
  };
  spendingForecast: Array<{
    date: string;
    predictedAmount: number;
  }>;
  riskScore: number;
}

// Security types
export interface RiskAssessment {
  riskScore: number;
  warnings: string[];
  recommendations: string[];
  addressReputation: {
    transactionCount: number;
    totalVolume: number;
    riskScore: number;
    lastSeen: string;
    tags: string[];
  };
}

export interface AddressReputation {
  address: string;
  transactionCount: number;
  totalVolume: number;
  riskScore: number;
  lastSeen: string;
  tags: string[];
}

export interface ScamDetection {
  isScam: boolean;
  confidence: number;
  reasons: string[];
  suggestions: string[];
}

export interface TransactionValidation {
  isValid: boolean;
  warnings: string[];
  gasEstimate: string;
  totalCost: string;
}
