import mongoose, { Schema } from 'mongoose';
import { IScheduledTransaction } from '../types';

const scheduledTransactionSchema = new Schema<IScheduledTransaction>({
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
  scheduledFor: {
    type: Date,
    required: true
  },
  recurring: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    endDate: {
      type: Date
    }
  },
  status: {
    type: String,
    enum: ['scheduled', 'executed', 'cancelled'],
    default: 'scheduled'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
scheduledTransactionSchema.index({ walletAddress: 1 });
scheduledTransactionSchema.index({ scheduledFor: 1 });
scheduledTransactionSchema.index({ status: 1 });
scheduledTransactionSchema.index({ walletAddress: 1, status: 1 });

export const ScheduledTransaction = mongoose.model<IScheduledTransaction>('ScheduledTransaction', scheduledTransactionSchema);
