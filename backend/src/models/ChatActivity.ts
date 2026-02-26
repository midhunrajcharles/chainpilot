import mongoose, { Schema } from 'mongoose';

export interface IChatActivity {
  walletAddress: string;
  sessionId: string;
  action: 'message_sent' | 'message_received' | 'transaction_initiated' | 'transaction_confirmed' | 'contact_created' | 'team_created' | 'analytics_requested' | 'balance_checked';
  message?: string;
  intent?: {
    type: string;
    amount?: string;
    token?: string;
    recipient?: string;
    name?: string;
    address?: string;
    teamName?: string;
    description?: string;
  };
  result?: {
    success: boolean;
    error?: string;
    data?: any;
  };
  timestamp: Date;
}

const chatActivitySchema = new Schema<IChatActivity>({
  walletAddress: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['message_sent', 'message_received', 'transaction_initiated', 'transaction_confirmed', 'contact_created', 'team_created', 'analytics_requested', 'balance_checked'],
    required: true
  },
  message: {
    type: String,
    trim: true
  },
  intent: {
    type: {
      type: String
    },
    amount: String,
    token: String,
    recipient: String,
    name: String,
    address: String,
    teamName: String,
    description: String
  },
  result: {
    success: Boolean,
    error: String,
    data: Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes
chatActivitySchema.index({ walletAddress: 1 });
chatActivitySchema.index({ sessionId: 1 });
chatActivitySchema.index({ action: 1 });
chatActivitySchema.index({ timestamp: -1 });
chatActivitySchema.index({ walletAddress: 1, timestamp: -1 });

export const ChatActivity = mongoose.model<IChatActivity>('ChatActivity', chatActivitySchema);
