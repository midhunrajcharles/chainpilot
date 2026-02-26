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

    // Build query string from search params
    const queryParams = new URLSearchParams();
    const allowedParams = ['search', 'recipient', 'token', 'startDate', 'endDate', 'page', 'limit'];
    
    allowedParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        queryParams.append(param, value);
      }
    });

    const queryString = queryParams.toString();
    const url = `/analytics/transaction-history${queryString ? `?${queryString}` : ''}`;

    // Forward request to backend
    const response = await backendApi.get(url, {
      headers: {
        'walletAddress': walletAddress
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error fetching transaction history:", error);
    
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
