import mongoose, { Schema } from 'mongoose';
import { IContact } from '../types';

const contactSchema = new Schema<IContact>({
  walletAddress: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    lowercase: true
  },
  group: {
    type: String,
    default: 'default',
    trim: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  reputation: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
contactSchema.index({ walletAddress: 1 });
contactSchema.index({ address: 1 });
contactSchema.index({ walletAddress: 1, group: 1 });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);
