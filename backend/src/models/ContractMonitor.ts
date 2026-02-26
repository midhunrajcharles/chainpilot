/**
 * ContractMonitor Model
 * Stores autonomous monitoring configurations and alert history
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAlert {
  id: string;
  monitorId?: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: any;
  timestamp: Date;
  acknowledged: boolean;
  aiExplanation?: string;
}

export interface IContractMonitor extends Document {
  userId: string;
  contractAddress: string;
  chainId: number;
  thresholds: {
    riskScoreIncrease?: number;
    liquidityChangePercent?: number;
    largeTransferAmount?: string;
    checkIntervalMinutes: number;
  };
  isActive: boolean;
  lastChecked?: Date;
  lastRiskScore?: number;
  alertHistory: IAlert[];
  notificationSettings: {
    pushNotifications: boolean;
    email: boolean;
    webhook?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  addAlert(alert: IAlert): Promise<IContractMonitor>;
  acknowledgeAlert(alertId: string): Promise<IContractMonitor>;
}

const AlertSchema = new Schema<IAlert>(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'RISK_SCORE_INCREASED',
        'NEW_VULNERABILITY',
        'LIQUIDITY_CHANGED',
        'LARGE_TRANSFER',
        'CONTRACT_UPGRADED',
        'UNUSUAL_ACTIVITY',
      ],
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    message: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    aiExplanation: {
      type: String,
    },
  },
  { _id: false }
);

const ContractMonitorSchema = new Schema<IContractMonitor>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    chainId: {
      type: Number,
      required: true,
      default: 11155111,
    },
    thresholds: {
      riskScoreIncrease: {
        type: Number,
        min: 0,
        max: 100,
      },
      liquidityChangePercent: {
        type: Number,
        min: 0,
        max: 100,
      },
      largeTransferAmount: {
        type: String,
      },
      checkIntervalMinutes: {
        type: Number,
        required: true,
        default: 5,
        min: 5,
        max: 1440, // Max 1 day
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastChecked: {
      type: Date,
    },
    lastRiskScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    alertHistory: [AlertSchema],
    notificationSettings: {
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      webhook: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ContractMonitorSchema.index({ userId: 1, isActive: 1 });
ContractMonitorSchema.index({ contractAddress: 1, isActive: 1 });
ContractMonitorSchema.index({ isActive: 1, lastChecked: 1 });

// Virtual for unacknowledged alerts count
ContractMonitorSchema.virtual('unacknowledgedAlertsCount').get(function () {
  return this.alertHistory.filter((alert) => !alert.acknowledged).length;
});

// Virtual for recent alerts (last 24 hours)
ContractMonitorSchema.virtual('recentAlerts').get(function () {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.alertHistory.filter(
    (alert) => alert.timestamp >= oneDayAgo
  );
});

// Method to add alert
ContractMonitorSchema.methods.addAlert = function (alert: IAlert) {
  this.alertHistory.push(alert);
  
  // Keep only last 100 alerts
  if (this.alertHistory.length > 100) {
    this.alertHistory = this.alertHistory.slice(-100);
  }
  
  return this.save();
};

// Method to acknowledge alert
ContractMonitorSchema.methods.acknowledgeAlert = function (alertId: string) {
  const alert = this.alertHistory.find((a: IAlert) => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return this.save();
  }
  return Promise.resolve(this);
};

// Ensure virtuals are included in JSON
ContractMonitorSchema.set('toJSON', { virtuals: true });
ContractMonitorSchema.set('toObject', { virtuals: true });

export default mongoose.model<IContractMonitor>(
  'ContractMonitor',
  ContractMonitorSchema
);
