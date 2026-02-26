import mongoose, { Schema } from 'mongoose';
import { IApproval, ITeamTransaction } from '../types';

const approvalSchema = new Schema<IApproval>({
  walletAddress: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['approve', 'reject'],
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const teamTransactionSchema = new Schema<ITeamTransaction>({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
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
  recipients: [{
    type: String,
    lowercase: true
  }],
  requiresApproval: {
    type: Boolean,
    default: true
  },
  approvals: [approvalSchema],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'executed'],
    default: 'pending'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
teamTransactionSchema.index({ teamId: 1 });
teamTransactionSchema.index({ walletAddress: 1 });
teamTransactionSchema.index({ status: 1 });
teamTransactionSchema.index({ teamId: 1, status: 1 });

export const TeamTransaction = mongoose.model<ITeamTransaction>('TeamTransaction', teamTransactionSchema);
