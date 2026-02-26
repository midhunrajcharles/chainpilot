import mongoose, { Schema } from 'mongoose';
import { ITeam, ITeamMember } from '../types';

const teamMemberSchema = new Schema<ITeamMember>({
  walletAddress: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const teamSchema = new Schema<ITeam>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  ownerWalletAddress: {
    type: String,
    required: true
  },
  members: [teamMemberSchema],
  settings: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
teamSchema.index({ ownerWalletAddress: 1 });
teamSchema.index({ 'members.walletAddress': 1 });

export const Team = mongoose.model<ITeam>('Team', teamSchema);
