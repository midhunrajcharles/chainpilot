export interface ParsedIntent {
  action: "transfer" | "send" | "pay" | "balance" | "check" | "balance_check" | "add_contact" | "create_contact" | "create_team" | "add_team" | "analytics" | "show_analytics" | "dashboard" | "spending" | "security_check" | "sharing" | "notifications" | "transaction_history" | "advanced_transactions" | "confirm_contact" | "confirm_team" | "analyze_contract";
  amount: string;
  token: string;
  recipient: string;
  confidence: number;
  // Additional fields for specific actions
  name?: string; // for add_contact
  teamName?: string; // for create_team
  description?: string; // for create_team
  members?: Array<{ walletAddress: string; name: string }>; // for create_team
  group?: string; // for add_contact
  period?: "7d" | "30d" | "90d" | "1y"; // for analytics
  contractAddress?: string; // for analyze_contract
}
  
  export interface TransactionRequest {
    from: string;
    to: string;
    amount: string;
    tokenAddress: string;
  }
  
  export interface TransactionResult {
    success: boolean;
    txHash?: string;
    error?: string;
    gasUsed?: string;
  }
  
  export interface ENSResolution {
    address: string | null;
    name: string;
}
  