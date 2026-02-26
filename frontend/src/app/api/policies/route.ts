import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// Handles GET /api/policies (list) and POST /api/policies (create)
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("walletAddress") || request.headers.get("walletaddress") || "";
    const url = new URL(request.url);
    const backendUrl = `${BACKEND}/api/policies${url.search}`;

    const res = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json", walletaddress: walletAddress },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("walletAddress") || request.headers.get("walletaddress") || "";
    const body = await request.text();
    const res = await fetch(`${BACKEND}/api/policies`, {
      method: "POST",
      headers: { "Content-Type": "application/json", walletaddress: walletAddress },
      body,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
