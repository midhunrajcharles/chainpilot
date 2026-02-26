import mongoose, { Schema } from 'mongoose';
import { INotificationSubscription } from '../types';

const notificationSubscriptionSchema = new Schema<INotificationSubscription>({
  walletAddress: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'push', 'sms'],
    required: true
  },
  endpoint: {
    type: String,
    trim: true
  },
  events: [{
    type: String,
    trim: true
  }],
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
notificationSubscriptionSchema.index({ walletAddress: 1 });
notificationSubscriptionSchema.index({ type: 1 });
notificationSubscriptionSchema.index({ active: 1 });
notificationSubscriptionSchema.index({ walletAddress: 1, type: 1 });

export const NotificationSubscription = mongoose.model<INotificationSubscription>('NotificationSubscription', notificationSubscriptionSchema);
