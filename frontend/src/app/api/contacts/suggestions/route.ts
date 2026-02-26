import { NextRequest, NextResponse } from "next/server";
import { backendApi } from "@/lib/axios";

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get("walletAddress");
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendApi.get(`/contacts/suggestions${query ? `?query=${query}` : ''}`, {
      headers: {
        'walletAddress': walletAddress
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error fetching contact suggestions:", error);
    
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
