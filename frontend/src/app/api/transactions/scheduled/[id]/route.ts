import { NextRequest, NextResponse } from "next/server";
import { backendApi } from "@/lib/axios";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get("walletAddress");
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Forward request to backend
    const response = await backendApi.put(`/transactions/scheduled/${params.id}`, body, {
      headers: {
        'walletAddress': walletAddress
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error updating scheduled transaction:", error);
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const walletAddress = request.headers.get("walletAddress");
    
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Forward request to backend
    const response = await backendApi.delete(`/transactions/scheduled/${params.id}`, {
      headers: {
        'walletAddress': walletAddress
      }
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error deleting scheduled transaction:", error);
    
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
