import { NextRequest, NextResponse } from "next/server";
import { TOKEN_ADDRESSES } from "@/lib/blockchain/config";

const SEPOLIA_RPCS = [
  process.env.NEXT_PUBLIC_SOMNIA_RPC_URL,
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.drpc.org",
  "https://rpc.ankr.com/eth_sepolia",
].filter(Boolean) as string[];

/** Direct JSON-RPC fetch with multi-endpoint fallback (10s timeout each). */
async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  let lastErr: unknown;
  for (const rpc of SEPOLIA_RPCS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message ?? "RPC error");
      return data.result;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      console.warn(`RPC ${rpc} failed:`, e);
    }
  }
  throw lastErr ?? new Error("All RPC endpoints failed");
}

export async function POST(req: NextRequest) {
  try {
    const { address, token } = await req.json();

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    let balance: string;

    if (!token || token === "ETH") {
      // Native ETH balance
      const hexBalance = (await rpcCall("eth_getBalance", [address, "latest"])) as string;
      // Convert from wei hex to ETH string
      const wei = BigInt(hexBalance);
      const eth = Number(wei) / 1e18;
      balance = eth.toFixed(6);
    } else {
      // ERC-20 token balance via balanceOf(address)
      const key = token.toUpperCase() as keyof typeof TOKEN_ADDRESSES;
      const tokenAddress = (TOKEN_ADDRESSES as Record<string, string>)[key];
      if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") {
        return NextResponse.json({ error: `Unknown token: ${token}` }, { status: 400 });
      }
      // ABI-encode balanceOf(address)
      const selector = "0x70a08231";
      const paddedAddress = address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
      const data = selector + paddedAddress;
      const hexBalance = (await rpcCall("eth_call", [{ to: tokenAddress, data }, "latest"])) as string;
      const raw = BigInt(hexBalance || "0x0");
      balance = (Number(raw) / 1e18).toFixed(6);
    }

    return NextResponse.json({ success: true, balance, token: token || "ETH" });
  } catch (error) {
    console.error("Balance API error:", error);
    return NextResponse.json(
      { error: "Failed to get balance", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

