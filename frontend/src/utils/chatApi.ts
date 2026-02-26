// interface ChatMessage {
//   sender: "user" | "agent";
//   text: string;
// }

// interface TransactionIntent {
//   amount: string;
//   token: string;
//   recipient: string;
//   confidence: number;
//   gasEstimate: string;
// }

// interface ChatResponse {
//   success: boolean;
//   response?: {
//     type: "transaction_intent" | "clarification" | "text";
//     data?: TransactionIntent;
//     message?: string;
//   };
//   rawText?: string;
//   error?: string;
//   details?: string;
// }

// interface ParseIntentResponse {
//   success: boolean;
//   intent?: TransactionIntent;
//   error?: string;
//   details?: string;
// }

// export class ChatApiClient {
//   private static baseUrl = "/api";

//   static async sendMessage(
//     message: string,
//     history?: ChatMessage[]
//   ): Promise<ChatResponse> {
//     try {
//       const response = await fetch(`${this.baseUrl}/chat`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           message,
//           history: history || [],
//         }),
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || "Failed to send message");
//       }

//       return await response.json();
//     } catch (error: unknown) {
//       let errorMessage = "Failed to communicate with chat API";
//       if (error && typeof error === "object" && "message" in error) {
//         errorMessage =
//           String((error as { message?: string }).message) || errorMessage;
//       }
//       console.error("Chat API Error:", error);
//       return {
//         success: false,
//         error: errorMessage,
//       };
//     }
//   }

//   static async parseIntent(message: string): Promise<ParseIntentResponse> {
//     try {
//       const response = await fetch(`${this.baseUrl}/parse-intent`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ message }),
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || "Failed to parse intent");
//       }

//       return await response.json();
//     } catch (error: unknown) {
//       let errorMessage = "Failed to parse transaction intent";
//       if (error && typeof error === "object" && "message" in error) {
//         errorMessage =
//           String((error as { message?: string }).message) || errorMessage;
//       }
//       console.error("Parse Intent Error:", error);
//       return {
//         success: false,
//         error: errorMessage,
//       };
//     }
//   }

//   /**
//    * Validate if a message contains a transaction intent
//    */
//   static async hasTransactionIntent(message: string): Promise<boolean> {
//     const result = await this.parseIntent(message);
//     return result.success && !!result.intent;
//   }

//   /**
//    * Format error messages for display
//    */
//   static formatError(error: string): string {
//     if (error.includes("API key")) {
//       return "AI service is not configured. Please contact support.";
//     }
//     if (error.includes("network") || error.includes("fetch")) {
//       return "Network error. Please check your connection and try again.";
//     }
//     return error;
//   }
// }

// export type {
//   ChatMessage,
//   TransactionIntent,
//   ChatResponse,
//   ParseIntentResponse,
// };


import { ApiResponse, Contact, Team, Transaction } from '@/types/api';
import { BaseApiClient } from './api/base';


export class ChatApiClient extends BaseApiClient {
  // Record transaction executed via chat
  static async recordTransaction(
    walletAddress: string,
    data: {
      from: string;
      to: string;
      amount: string;
      token: string;
      txHash: string;
      gasUsed?: string;
      status?: 'pending' | 'confirmed' | 'failed';
    }
  ): Promise<ApiResponse<Transaction>> {
    return this.post<Transaction>('/chat/record-transaction', walletAddress, data);
  }

  // Create contact via chat
  static async createContact(
    walletAddress: string,
    data: {
      name: string;
      address: string;
      group?: string;
    }
  ): Promise<ApiResponse<Contact>> {
    return this.post<Contact>('/chat/create-contact', walletAddress, data);
  }

  // Create team via chat
  static async createTeam(
    walletAddress: string,
    data: {
      name: string;
      description?: string;
      members?: Array<{ walletAddress: string; name: string }>;
    }
  ): Promise<ApiResponse<Team>> {
    return this.post<Team>('/chat/create-team', walletAddress, data);
  }

  // Get contacts for chat suggestions
  static async getContacts(walletAddress: string): Promise<ApiResponse<Contact[]>> {
    return this.get<Contact[]>('/chat/contacts', walletAddress);
  }

  // Get teams for chat suggestions
  static async getTeams(walletAddress: string): Promise<ApiResponse<Team[]>> {
    return this.get<Team[]>('/chat/teams', walletAddress);
  }

  // Log chat activity
  static async logActivity(
    walletAddress: string,
    data: {
      action: 'message_sent' | 'message_received' | 'transaction_initiated' | 'transaction_confirmed' | 'contact_created' | 'team_created' | 'analytics_requested' | 'balance_checked';
      sessionId: string;
      message?: string;
      intent?: any;
      result?: any;
    }
  ): Promise<ApiResponse<void>> {
    return this.post<void>('/chat/log-activity', walletAddress, data);
  }
}
