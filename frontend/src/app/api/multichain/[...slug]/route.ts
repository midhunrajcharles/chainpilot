import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

async function proxyToBackend(request: NextRequest, path: string): Promise<NextResponse> {
  try {
    const walletAddress = request.headers.get("walletAddress") || request.headers.get("walletaddress") || "";
    const url = new URL(request.url);
    const backendUrl = `${BACKEND}/api/multichain${path}${url.search}`;

    const init: RequestInit = {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        walletaddress: walletAddress,
      },
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      const body = await request.text();
      if (body) init.body = body;
    }

    const res = await fetch(backendUrl, init);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("Multichain proxy error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  return proxyToBackend(request, params.slug?.length ? "/" + params.slug.join("/") : "");
}

export async function POST(request: NextRequest, { params }: { params: { slug: string[] } }) {
  return proxyToBackend(request, params.slug?.length ? "/" + params.slug.join("/") : "");
}
