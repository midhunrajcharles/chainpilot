import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityPolicy extends Document {
  walletAddress: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: PolicyRule[];
  whitelistedAddresses: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type PolicyRuleType =
  | 'MAX_TRANSACTION_VALUE'    // Alert/block txs above X ETH
  | 'WHITELIST_ONLY'           // Only allow transfers to whitelisted addresses
  | 'DAILY_SPEND_LIMIT'        // Max spend per day
  | 'REQUIRE_COOL_DOWN'        // Min time between large txs
  | 'BLOCK_UNVERIFIED_CONTRACTS' // Block interactions with unverified contracts
  | 'ALERT_NEW_ADDRESS'        // Alert when sending to a first-time address
  | 'CUSTOM_ANOMALY_THRESHOLD'; // Custom risk score threshold for anomaly alerts

export interface PolicyRule {
  type: PolicyRuleType;
  enabled: boolean;
  params: Record<string, any>;  // e.g. { maxValue: "1", token: "ETH" }
  action: 'ALERT' | 'BLOCK';
  notifyVia: ('in_app' | 'email')[];
}

const PolicyRuleSchema = new Schema<PolicyRule>({
  type:       { type: String, required: true },
  enabled:    { type: Boolean, default: true },
  params:     { type: Schema.Types.Mixed, default: {} },
  action:     { type: String, enum: ['ALERT', 'BLOCK'], default: 'ALERT' },
  notifyVia:  [String],
}, { _id: false });

const SecurityPolicySchema = new Schema<ISecurityPolicy>(
  {
    walletAddress:        { type: String, required: true },
    name:                 { type: String, required: true, trim: true },
    description:          { type: String, default: '' },
    enabled:              { type: Boolean, default: true },
    rules:                [PolicyRuleSchema],
    whitelistedAddresses: [String],
  },
  { timestamps: true }
);

SecurityPolicySchema.index({ walletAddress: 1 });

export const SecurityPolicy = mongoose.model<ISecurityPolicy>('SecurityPolicy', SecurityPolicySchema);
