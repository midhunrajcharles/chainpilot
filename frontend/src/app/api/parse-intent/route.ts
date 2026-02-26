import { NextRequest, NextResponse } from "next/server";
import { GeminiParser } from "@/lib/ai/gemini";
import { BlockchainClient } from "@/lib/blockchain/client";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    const parser = new GeminiParser();
    const intent = await parser.parseIntent(message);

    if (!intent) {
      return NextResponse.json({
        success: false,
        message: "I couldn't understand that command. Please try something like:\n• 'Send 50 ETH to Alice'\n• 'Transfer 100 tokens to 0x123...'\n• 'Pay Bob 25 ETH'",
      });
    }

    // Resolve recipient address if it's a name
    const blockchain = new BlockchainClient();
    const resolvedAddress = await blockchain.resolveAddress(intent.recipient);

    return NextResponse.json({
      success: true,
      intent: {
        ...intent,
        recipientAddress: resolvedAddress,
      },
    });
  } catch (error) {
    console.error("Error in parse-intent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}