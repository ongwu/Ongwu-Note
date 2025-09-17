// 环境变量测试API
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 打印环境变量信息到控制台（用于调试）
    console.log('环境变量测试 - 当前环境:', process.env.NODE_ENV);
    console.log('环境变量测试 - DB_HOST:', process.env.ONGWU_NOTE_DB_HOST || '未设置');
    console.log('环境变量测试 - DB_PORT:', process.env.ONGWU_NOTE_DB_PORT || '未设置');
    console.log('环境变量测试 - DB_NAME:', process.env.ONGWU_NOTE_DB_NAME || '未设置');
    console.log('环境变量测试 - DB_USER:', process.env.ONGWU_NOTE_DB_USER ? '已设置(部分隐藏)' : '未设置');
    console.log('环境变量测试 - DB_PASSWORD:', process.env.ONGWU_NOTE_DB_PASSWORD ? '已设置(部分隐藏)' : '未设置');
    
    // 返回环境变量信息（隐藏敏感信息）
    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV || 'development',
      databaseConfig: {
        host: process.env.ONGWU_NOTE_DB_HOST || '未设置',
        port: process.env.ONGWU_NOTE_DB_PORT || '未设置',
        database: process.env.ONGWU_NOTE_DB_NAME || '未设置',
        user: process.env.ONGWU_NOTE_DB_USER ? '已设置(隐藏)' : '未设置',
        hasPassword: !!process.env.ONGWU_NOTE_DB_PASSWORD
      },
      nextJsVersion: process.env.NEXT_RUNTIME || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('环境变量测试失败:', error);
    return NextResponse.json(
      { success: false, message: '环境变量测试失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}