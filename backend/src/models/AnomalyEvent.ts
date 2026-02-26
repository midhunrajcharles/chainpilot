import mongoose, { Schema, Document, Types } from 'mongoose';

export type AnomalyType =
  | 'UNUSUAL_TRANSFER_VOLUME'
  | 'RAPID_TRANSACTION_BURST'
  | 'NEW_HIGH_VALUE_COUNTERPARTY'
  | 'DORMANT_WALLET_ACTIVATED'
  | 'CIRCULAR_TRANSFER_PATTERN'
  | 'BLACKLISTED_COUNTERPARTY'
  | 'AFTER_HOURS_ACTIVITY'
  | 'GAS_PRICE_SPIKE'
  | 'FAILED_TX_CLUSTER';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IAnomalyEvent extends Document {
  walletAddress: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  title: string;
  description: string;
  confidence: number;          // 0–100
  riskScore: number;           // 0–100
  details: Record<string, any>;
  relatedTxHashes: string[];
  relatedAddresses: string[];
  acknowledged: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

const AnomalyEventSchema = new Schema<IAnomalyEvent>(
  {
    walletAddress:    { type: String, required: true, index: true },
    type:             { type: String, required: true },
    severity:         { type: String, required: true },
    title:            { type: String, required: true },
    description:      { type: String, required: true },
    confidence:       { type: Number, default: 0 },
    riskScore:        { type: Number, default: 0 },
    details:          { type: Schema.Types.Mixed, default: {} },
    relatedTxHashes:  [String],
    relatedAddresses: [String],
    acknowledged:     { type: Boolean, default: false },
    resolvedAt:       Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AnomalyEventSchema.index({ walletAddress: 1, createdAt: -1 });
AnomalyEventSchema.index({ acknowledged: 1 });
AnomalyEventSchema.index({ severity: 1 });

export const AnomalyEvent = mongoose.model<IAnomalyEvent>('AnomalyEvent', AnomalyEventSchema);
