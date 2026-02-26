import { NextRequest, NextResponse } from "next/server";
import { backendApi } from "@/lib/axios";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("walletAddress");
    const { searchParams } = new URL(request.url);
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const unread = searchParams.get("unread");
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";

    // Forward request to backend
    const response = await backendApi.get(`/notifications?unread=${unread}&page=${page}&limit=${limit}`, {
      headers: {
        'walletAddress': walletAddress
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    
    if (error.response) {
      return NextResponse.json(
        { success: false, error: error.response.data.error || "Backend error occurred" },
        { status: error.response.status }
      );
    }
    
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
