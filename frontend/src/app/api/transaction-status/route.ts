import { NextRequest, NextResponse } from "next/server";
import { BlockchainClient } from "@/lib/blockchain/client";

export async function POST(req: NextRequest) {
  try {
    const { txHash } = await req.json();

    if (!txHash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 }
      );
    }

    const blockchain = new BlockchainClient();
    const status = await blockchain.getTransactionStatus(txHash);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("Error getting transaction status:", error);
    return NextResponse.json(
      { error: "Failed to get transaction status" },
      { status: 500 }
    );
  }
}