import { NextResponse } from "next/server";
import { mockStats } from "@/lib/mock-data";

export async function GET() {
  // 模拟实时数据更新
  const realtimeStats = {
    ...mockStats,
    totalMessages: mockStats.totalMessages + Math.floor(Math.random() * 10),
    timestamp: new Date().toISOString(),
  };
  
  return NextResponse.json({
    success: true,
    data: realtimeStats
  });
} 