import mongoose, { Schema } from 'mongoose';
import { ITransaction } from '../types';

const transactionSchema = new Schema<ITransaction>({
  walletAddress: {
    type: String,
    required: true
  },
  from: {
    type: String,
    required: true,
    lowercase: true
  },
  to: {
    type: String,
    required: true,
    lowercase: true
  },
  amount: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true,
    uppercase: true
  },
  txHash: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  gasUsed: {
    type: String,
    default: '0'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
transactionSchema.index({ walletAddress: 1 });
transactionSchema.index({ txHash: 1 });
transactionSchema.index({ walletAddress: 1, createdAt: -1 });
transactionSchema.index({ from: 1 });
transactionSchema.index({ to: 1 });
transactionSchema.index({ token: 1 });
transactionSchema.index({ status: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
