import mongoose, { Schema } from 'mongoose';
import { IConditionalTransaction } from '../types';

const conditionalTransactionSchema = new Schema<IConditionalTransaction>({
  walletAddress: {
    type: String,
    required: true
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
  recipient: {
    type: String,
    required: true,
    lowercase: true
  },
  condition: {
    type: {
      type: String,
      enum: ['price', 'time', 'balance'],
      required: true
    },
    operator: {
      type: String,
      enum: ['>', '<', '>=', '<=', '=='],
      required: true
    },
    value: {
      type: String,
      required: true
    },
    token: {
      type: String,
      uppercase: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'executed', 'cancelled'],
    default: 'active'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
conditionalTransactionSchema.index({ walletAddress: 1 });
conditionalTransactionSchema.index({ status: 1 });
conditionalTransactionSchema.index({ walletAddress: 1, status: 1 });

export const ConditionalTransaction = mongoose.model<IConditionalTransaction>('ConditionalTransaction', conditionalTransactionSchema);
