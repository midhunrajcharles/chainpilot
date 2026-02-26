import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("walletAddress") || request.headers.get("walletaddress") || "";
    const url = new URL(request.url);
    const res = await fetch(`${BACKEND}/api/multichain/chains${url.search}`, {
      headers: { "Content-Type": "application/json", walletaddress: walletAddress },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
