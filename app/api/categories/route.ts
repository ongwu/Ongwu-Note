// Ongwu笔记 - 分类管理API
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

    const token = request.cookies.get('ongwu_token')?.value;
    const cacheKey = `categories_${authResult.userId!}`;
    
    // 检查缓存
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // 获取分类数据
    const db = PostgresOngwuDatabase.getInstance();
    const categories = await db.getCategoriesByUserId(authResult.userId!);
    
    const response = {
      success: true,
      categories
    };

    // 缓存结果（30秒）
    apiCache.set(cacheKey, response, 30000);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('获取分类列表错误:', error);
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

    const { name, description } = await request.json();
    
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, message: '分类名称不能为空' },
        { status: 400 }
      );
    }

    const db = PostgresOngwuDatabase.getInstance();
    const category = await db.createCategory(name.trim(), description || '', authResult.userId!);
    
    // 清除分类缓存
    apiCache.clearPattern(`categories_${authResult.userId!}`);
    
    return NextResponse.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('创建分类错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
