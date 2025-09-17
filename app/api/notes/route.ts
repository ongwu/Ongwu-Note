// Ongwu笔记 - 获取笔记列表API
import { NextRequest, NextResponse } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { apiCache } from '@/lib/api-cache';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    // 使用优化的认证中间件
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const cacheKey = `notes_${authResult.userId!}`;
    
    // 检查缓存
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // 获取笔记数据
    const db = PostgresOngwuDatabase.getInstance();
    const notes = await db.getNotesByUserId(authResult.userId!);
    
    const response = {
      success: true,
      notes
    };

    // 缓存结果（30秒）
    apiCache.set(cacheKey, response, 30000);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('获取笔记列表错误:', error);
    console.error('错误详情:', {
      message: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { success: false, message: '服务器错误', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 使用优化的认证中间件
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const { title, content, category_id } = await request.json();
    
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { success: false, message: '标题不能为空' },
        { status: 400 }
      );
    }
    
    // 内容可以为空，但至少要有一个空字符串
    const noteContent = content || '';

    const db = PostgresOngwuDatabase.getInstance();
    const note = await db.createNote(title, noteContent, category_id, authResult.userId!);
    
    // 清除笔记缓存
    apiCache.clearPattern(`notes_${authResult.userId!}`);
    
    return NextResponse.json({
      success: true,
      note
    });
  } catch (error) {
    console.error('创建笔记错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
