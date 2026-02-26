import { NextRequest, NextResponse } from "next/server";
import { BlockchainClient } from "@/lib/blockchain/client";
import { TOKEN_ADDRESSES } from "@/lib/blockchain/config";

export async function POST(req: NextRequest) {
  try {
    const { from, to, amount, token } = await req.json();

    if (!from || !to || !amount || !token) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const blockchain = new BlockchainClient();
    const tokenAddress = TOKEN_ADDRESSES[token as keyof typeof TOKEN_ADDRESSES];

    if (!tokenAddress) {
      return NextResponse.json(
        { error: "Unsupported token" },
        { status: 400 }
      );
    }

    const gasEstimate = await blockchain.estimateGas(from, to, amount, tokenAddress);

    return NextResponse.json({
      success: true,
      gasEstimate,
      token,
    });
  } catch (error) {
    console.error("Error estimating gas:", error);
    return NextResponse.json(
      { error: "Failed to estimate gas" },
      { status: 500 }
    );
  }
}