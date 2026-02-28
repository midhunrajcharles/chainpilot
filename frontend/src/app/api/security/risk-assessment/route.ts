import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBackendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
}

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("walletAddress") || request.headers.get("walletaddress");
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const backendUrl = `${getBackendBaseUrl()}/api/security/risk-assessment`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        walletAddress,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    const text = await response.text();
    let payload: any = { success: response.ok };
    try {
      payload = text ? JSON.parse(text) : payload;
    } catch {
      payload = {
        success: response.ok,
        error: text || "Unexpected backend response",
      };
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error: any) {
    console.error("Error assessing risk:", error);

    const message = error?.name === "AbortError"
      ? "Risk assessment timed out while contacting backend"
      : (error?.message || "Internal server error");

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
