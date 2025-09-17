// Ongwu笔记 - 文件下载API
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth-middleware';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    // 使用优化的认证中间件
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const filename = params.filename;
    const exportDir = path.join(process.cwd(), 'exports');
    const filepath = path.join(exportDir, filename);

    // 安全检查：确保文件在exports目录内
    if (!filepath.startsWith(exportDir)) {
      return NextResponse.json(
        { success: false, message: '无效的文件路径' },
        { status: 400 }
      );
    }

    // 检查文件是否存在
    if (!fs.existsSync(filepath)) {
      return NextResponse.json(
        { success: false, message: '文件不存在' },
        { status: 404 }
      );
    }

    // 读取文件内容
    const fileContent = fs.readFileSync(filepath, 'utf8');
    
    // 设置响应头
    const response = new NextResponse(fileContent);
    response.headers.set('Content-Type', 'text/markdown; charset=utf-8');
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    response.headers.set('Cache-Control', 'no-cache');
    
    return response;
  } catch (error) {
    console.error('文件下载失败:', error);
    return NextResponse.json(
      { success: false, message: '文件下载失败' },
      { status: 500 }
    );
  }
}
