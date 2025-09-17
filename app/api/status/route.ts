// 简单状态检查API - 不连接数据库
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: '服务运行中',
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
}