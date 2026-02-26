import mongoose, { Schema } from 'mongoose';
import { IQueuedTransaction } from '../types';

const queuedTransactionSchema = new Schema<IQueuedTransaction>({
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
    type: Date
  },
  status: {
    type: String,
    enum: ['queued', 'synced', 'failed'],
    default: 'queued'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
queuedTransactionSchema.index({ walletAddress: 1 });
queuedTransactionSchema.index({ status: 1 });
queuedTransactionSchema.index({ walletAddress: 1, status: 1 });

export const QueuedTransaction = mongoose.model<IQueuedTransaction>('QueuedTransaction', queuedTransactionSchema);
