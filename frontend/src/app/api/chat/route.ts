// app/api/chat/route.ts
// ────────────────────────────────────────────────────────────────────────
import { GeminiParser } from "@/lib/ai/gemini";
import { sendToElizaAgent } from "@/lib/ai/elizaClient";
import { BlockchainClient } from "@/lib/blockchain/client";
import { TOKEN_ADDRESSES } from "@/lib/blockchain/config";
import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

type ActionResult =
  | { recipient: string; gasEstimate: string; amount: string; token: string }
  | { balance: string; token: string }
  | { contact: { name: string; address: string; group?: string } }
  | { team: { name: string; description?: string; members?: any[] } }
  | { analytics: any }
  | { contractAnalysis: { contractAddress: string; riskScore: number; severity: string } }
  | { error: string }
  | null;

// ────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  console.log("POST /api/chat");

  try {
    const { message, context, senderAddress } = await req.json();
    if (!message?.trim() || !senderAddress) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const parser = new GeminiParser();
    const blockchain = new BlockchainClient();

    const formattedContext = Array.isArray(context)
      ? context.map(m => `${m.sender === "user" ? "User" : "Agent"}: ${m.text}`).join("\n")
      : "";
      

    // ---- INTENT ----
    const intent = await parser.parseIntent(message);
    if (!intent) {
      // No structured intent – forward to the ElizaOS agent for a natural response
      let txt: string;
      try {
        txt = await sendToElizaAgent(message, senderAddress);
      } catch (elizaErr: any) {
        console.warn("ElizaOS agent unavailable, falling back to Gemini:", elizaErr.message);
        txt = await parser.generateResponse(formattedContext, message, senderAddress);
      }
      return NextResponse.json({ success: true, response: txt });
    }

    let aiResponse = "";
    let actionResult: ActionResult = null;

// -------------------------------------------------
// 1. TRANSFER / SEND / PAY
// -------------------------------------------------
if (["transfer", "send", "pay"].includes(intent.action!.toLowerCase())) {
  let recipientAddress = intent.recipient;
  const token = intent.token || "STT";
  const amount = intent.amount;
  
  // ✅ STEP 1: try to find recipient among user contacts if not a valid address
  const isWalletAddress = /^0x[a-fA-F0-9]{40}$/.test(recipientAddress || "");
 
  if (!isWalletAddress) {
    try {
      const contactRes = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/contacts`,
        { headers: { walletaddress: senderAddress } }
      );

      const contacts = contactRes.data?.data || [];
      // const match = contacts.find(
      //   (c: any) => c.name?.toLowerCase() === recipientAddress?.toLowerCase()
      // );
      const match = contacts.find(
        (c: any) => c.name?.toLowerCase().startsWith(recipientAddress?.toLowerCase())
      );
      
      if (match) {
        recipientAddress = match.address;
        console.log(`Matched contact: ${match.name} → ${match.address}`);
      }
    } catch (e) {
      console.error("Error fetching contacts:", e.message);
    }
  }

  // ✅ STEP 2: still not resolved? ask user for address
  if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
    aiResponse = `I couldn’t find **${intent.recipient}** in your contacts. `;
    actionResult = { error: "needs_address" };
  } else {
    // ✅ STEP 3: estimate gas and prepare transfer confirmation
    const tokenAddr = token === "ETH" ? null : TOKEN_ADDRESSES.ETH;
    const gas = await blockchain.estimateGas(senderAddress, recipientAddress, amount, tokenAddr ?? "");
    aiResponse = `Send **${amount} ${token}** to **${intent.recipient}** (${recipientAddress})?\nEstimated gas: ${gas} ETH`;
    actionResult = { recipient: recipientAddress, gasEstimate: gas, amount, token };
  }
}


    // -------------------------------------------------
    // 2. BALANCE – CALL YOUR /api/balance ENDPOINT
    // -------------------------------------------------
    else if (intent.action === "balance") {
      const token = intent.token || "ETH";

      try {
        // Use the configured app base URL for internal server-to-server call
        const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
        const balRes = await fetch(`${appBaseUrl}/api/balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: senderAddress, token }),
        });

        const balData = await balRes.json();

        if (!balData.success) throw new Error(balData.error || "balance fetch failed");

        aiResponse = `Your ${token} balance: **${balData.balance}**`;
        actionResult = { balance: balData.balance, token };
      } catch (err: any) {
        console.error("Balance fetch error:", err);
        aiResponse = "Could not retrieve balance. Try again later.";
        actionResult = { error: "balance_error" };
      }
    }

    // -------------------------------------------------
    // 3. ADD CONTACT (auto-save when confidence ≥ 0.8)
    // -------------------------------------------------
// -------------------------------------------------
// 3. ADD CONTACT (auto-save when confidence ≥ 0.8)
// -------------------------------------------------
else if (["add_contact", "create_contact"].includes(intent.action!)) {
  const { name, recipient: address } = intent;
  if (!name || !address) {
    aiResponse = "Please give me a name **and** a wallet address.";
    actionResult = { error: "missing_fields" };
  } else if (intent.confidence! >= 0.8) {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/create-contact`,
        { name: name.trim(), address, group: "default" },
        { headers: { walletaddress: senderAddress } }
      );

      if (res.data.success) {
        aiResponse = `✅ Contact **${name}** saved successfully!`;
        actionResult = { contact: { name, address, group: "default" } };
      } 
      else if (res.data.error?.toLowerCase().includes("invalid address")) {
        aiResponse = `⚠️ Invalid wallet address provided for **${name}**. Please enter a valid Ethereum address (e.g., 0xabc...123).`;
        actionResult = { error: "invalid_address" };
      } 
      else if (res.data.error?.toLowerCase().includes("exists")) {
        aiResponse = `✅ Contact **${name}** already exists.`;
        actionResult = { contact: { name, address, group: "default" } };
      } 
      else {
        aiResponse = `❌ Could not save contact: ${res.data.error || "Unknown error"}`;
        actionResult = { error: res.data.error };
      }
    } catch (e: any) {
      console.error("Create contact error:", e?.response?.data || e.message);
      const errorMsg = e?.response?.data?.error?.toLowerCase?.() || "";

      if (errorMsg.includes("invalid address")) {
        aiResponse = `⚠️ Invalid wallet address format.`;
        actionResult = { error: "invalid_address" };
      } else if (errorMsg.includes("exists")) {
        aiResponse = `✅ Contact **${name}** already exists.`;
        actionResult = { contact: { name, address, group: "default" } };
      } else {
        aiResponse = "⚠️ Something went wrong while saving your contact. Try again later.";
        actionResult = { error: "backend" };
      }
    }
  } else {
    aiResponse = `Add **${name}** (${address}) as a contact? Reply **yes** to confirm.`;
    actionResult = { contact: { name, address, group: "default" } };
  }
}


 // -------------------------------------------------
// 4. CREATE TEAM (auto-create when confidence ≥ 0.8)
// -------------------------------------------------
else if (intent.action === "create_team") {
  const teamName = (intent.teamName || intent.name)?.trim();

  if (!teamName) {
    aiResponse = "Please provide a team name.";
    actionResult = { error: "missing_name" };
  } else {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/create-team`,
        { name: teamName, description: "", members: [] },
        { headers: { walletaddress: senderAddress } }
      );

      if (res.data.success) {
        aiResponse = `✅ Team **${teamName}** created successfully!`;
        actionResult = { team: { name: teamName } };
      } 
      else if (res.data.error?.toLowerCase().includes("exists")) {
        aiResponse = `✅ Team **${teamName}** already exists.`;
        actionResult = { team: { name: teamName } };
      } 
      else {
        aiResponse = `❌ Could not create team: ${res.data.error || "Unknown error"}`;
        actionResult = { error: res.data.error || "unknown" };
      }
    } catch (e: any) {
      console.error("Create team error:", e?.response?.data || e.message);
      const errMsg = e?.response?.data?.error?.toLowerCase?.() || "";

      if (errMsg.includes("exists")) {
        aiResponse = `✅ Team **${teamName}** already exists.`;
        actionResult = { team: { name: teamName } };
      } else {
        aiResponse = "⚠️ Something went wrong while creating your team. Try again later.";
        actionResult = { error: "backend" };
      }
    }
  }
}


    // -------------------------------------------------
    // 5. ANALYZE CONTRACT (security scan)
    // -------------------------------------------------
    else if (intent.action === "analyze_contract") {
      const contractAddress = intent.contractAddress?.trim();

      if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
        aiResponse = "Please provide a valid contract address (0x...).";
        actionResult = { error: "invalid_contract_address" };
      } else {
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/contracts/analyze`,
            { contractAddress, chainId: 50312, userAddress: senderAddress }
          );

          if (res.data.success) {
            const { riskScore, severity, findingsCount, aiAnalysis } = res.data.data;
            const severityEmoji = { LOW: "🟢", MEDIUM: "🟡", HIGH: "🟠", CRITICAL: "🔴" }[severity] || "⚪";
            
            aiResponse = `${severityEmoji} **Contract Analysis Complete**\n\n` +
              `**Address:** \`${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}\`\n` +
              `**Risk Score:** ${riskScore}/100 (${severity})\n` +
              `**Vulnerabilities Found:** ${findingsCount}\n\n` +
              `**AI Verdict:** ${aiAnalysis?.verdict || "Analysis pending"}\n\n` +
              (aiAnalysis?.explanation ? `${aiAnalysis.explanation.substring(0, 200)}...\n\n` : "") +
              `View full report in the Contract Scanner tab.`;

            actionResult = { contractAnalysis: { contractAddress, riskScore, severity } };
          } else {
            aiResponse = `❌ Could not analyze contract: ${res.data.error || "Unknown error"}`;
            actionResult = { error: res.data.error || "analysis_failed" };
          }
        } catch (e: any) {
          console.error("Contract analysis error:", e?.response?.data || e.message);
          aiResponse = "⚠️ Something went wrong while analyzing the contract. The contract may not exist or the network is unavailable.";
          actionResult = { error: "backend" };
        }
      }
    }


    // -------------------------------------------------
    // 6. FALLBACK – forwarded to the ElizaOS agent
    // -------------------------------------------------
    else {
      try {
        aiResponse = await sendToElizaAgent(message, senderAddress);
      } catch (elizaErr: any) {
        console.warn("ElizaOS agent unavailable, falling back to Gemini:", elizaErr.message);
        aiResponse = await parser.generateResponse(formattedContext, message, senderAddress);
      }
    }

    // -------------------------------------------------
    // OPTIONAL LOG (silently ignore errors)
    // -------------------------------------------------
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/chat/log-activity`,
        {
          action: "message_received",
          sessionId: "nextjs",
          message: aiResponse,
          intent,
          result: actionResult,
        },
        { headers: { "walletaddress": senderAddress } }
      );
    } catch {
      // swallow – logging is non-critical
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      intent,
      actionResult,
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}