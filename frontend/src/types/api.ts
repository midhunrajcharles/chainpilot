export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  walletAddress: string;
  name?: string;
  preferences?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  address: string;
  group?: string;
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  walletAddress: string;
  name: string;
  joinedAt: string;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  status: string;
  gasUsed?: string;
  createdAt: string;
}

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

export interface NotificationSubscription {
  id: string;
  type: 'email' | 'push' | 'sms';
  endpoint?: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

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

export interface SpendingPattern {
  period: string;
  amount: number;
  count: number;
}

export interface TransactionHistoryParams {
  search?: string;
  recipient?: string;
  token?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface NotificationParams {
  unread?: boolean;
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface HealthStatus {
  status: string;
  services: Record<string, { status: string; error?: string }>;
  uptime: number;
  responseTime: number;
  timestamp: string;
  version: string;
  environment: string;
}

export interface Metrics {
  system: {
    uptime: { seconds: number; minutes: number; hours: number; days: number };
    memory: { rss: number; heapTotal: number; heapUsed: number; external: number; arrayBuffers: number };
    cpu: { user: number; system: number };
    platform: string;
    nodeVersion: string;
    pid: number;
  };
  database: Record<string, unknown> | null;
  collections: Record<string, number>;
  environment: { nodeEnv?: string; port?: string; corsOrigin?: string };
  timestamp: string;
}
