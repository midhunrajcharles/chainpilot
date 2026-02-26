/**
 * AuditLog Model
 * Stores contract security audit records with on-chain hash references
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  reportHash: string;
  contractAddress: string;
  chainId: number;
  riskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  findingsCount: number;
  findings: Array<{
    flag: string;
    severity: string;
    description: string;
  }>;
  aiVerdict: 'SAFE' | 'CAUTION' | 'DANGER' | 'CRITICAL';
  txHash?: string;
  blockNumber?: number;
  initiator: string;
  isVerifiedOnChain: boolean;
  analyzedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  explorerUrl?: string | null;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    reportHash: {
      type: String,
      required: true,
      unique: true,
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
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    severity: {
      type: String,
      required: true,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      index: true,
    },
    findingsCount: {
      type: Number,
      required: true,
      default: 0,
    },
    findings: [
      {
        flag: { type: String, required: true },
        severity: { type: String, required: true },
        description: { type: String, required: true },
      },
    ],
    aiVerdict: {
      type: String,
      required: true,
      enum: ['SAFE', 'CAUTION', 'DANGER', 'CRITICAL'],
    },
    txHash: {
      type: String,
      sparse: true,
      index: true,
    },
    blockNumber: {
      type: Number,
      sparse: true,
    },
    initiator: {
      type: String,
      required: true,
      lowercase: true,
    },
    isVerifiedOnChain: {
      type: Boolean,
      default: false,
    },
    analyzedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
AuditLogSchema.index({ contractAddress: 1, createdAt: -1 });
AuditLogSchema.index({ severity: 1, createdAt: -1 });
AuditLogSchema.index({ initiator: 1, createdAt: -1 });

// Virtual for explorer URL
AuditLogSchema.virtual('explorerUrl').get(function () {
  if (!this.txHash) return null;
  
  const explorers: Record<number, string> = {
    11155111: 'https://sepolia.etherscan.io',
    1: 'https://etherscan.io',
    137: 'https://polygonscan.com',
  };
  
  const baseUrl = explorers[this.chainId] || explorers[11155111];
  return `${baseUrl}/tx/${this.txHash}`;
});

// Ensure virtuals are included in JSON
AuditLogSchema.set('toJSON', { virtuals: true });
AuditLogSchema.set('toObject', { virtuals: true });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
