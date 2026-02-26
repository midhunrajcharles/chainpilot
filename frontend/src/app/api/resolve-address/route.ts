import { NextRequest, NextResponse } from "next/server";
import { BlockchainClient } from "@/lib/blockchain/client";

export async function POST(req: NextRequest) {
  try {
    const { nameOrAddress } = await req.json();

    if (!nameOrAddress) {
      return NextResponse.json(
        { error: "Name or address is required" },
        { status: 400 }
      );
    }

    const blockchain = new BlockchainClient();
    const address = await blockchain.resolveAddress(nameOrAddress);

    if (!address) {
      return NextResponse.json(
        { error: "Could not resolve address" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      address,
      original: nameOrAddress,
    });
  } catch (error) {
    console.error("Error resolving address:", error);
    return NextResponse.json(
      { error: "Failed to resolve address" },
      { status: 500 }
    );
  }
}