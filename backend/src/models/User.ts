import mongoose, { Schema } from 'mongoose';
import { IUser } from '../types';

const userSchema = new Schema<IUser>({
  walletAddress: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    trim: true
  },
  preferences: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ walletAddress: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', userSchema);
