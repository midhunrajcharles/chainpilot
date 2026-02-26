import { NextRequest, NextResponse } from "next/server";
import { backendApi } from "@/lib/axios";

export async function GET(request: NextRequest) {
  try {
    // Forward request to backend
    const response = await backendApi.get('/metrics');

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("Error fetching metrics:", error);
    
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
