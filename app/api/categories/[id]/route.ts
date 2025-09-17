// Ongwu笔记 - 分类更新和删除API
import { NextRequest, NextResponse } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { apiCache } from '@/lib/api-cache';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const categoryId = parseInt(params.id);
    const body = await request.json();
    const { name, description, sort_order } = body;
    
    if (name && name.trim() === '') {
      return NextResponse.json(
        { success: false, message: '分类名称不能为空' },
        { status: 400 }
      );
    }

    const db = PostgresOngwuDatabase.getInstance();
    let category;
    
    // 处理排序更新
    if (typeof sort_order === 'number' && !isNaN(sort_order)) {
      // 更新排序 - 确保是有效的数字
      const sortOrderValue = Number(sort_order);
      const success = await db.updateCategorySortOrder(categoryId, sortOrderValue, authResult.userId!);
      if (!success) {
        return NextResponse.json(
          { success: false, message: '分类不存在' },
          { status: 404 }
        );
      }
      // 获取更新后的分类信息
      const categories = await db.getCategoriesByUserId(authResult.userId!);
      category = categories.find(cat => cat.id === categoryId);
    } else {
      // 更新名称和描述
      category = await db.updateCategory(categoryId, name.trim(), description || '', authResult.userId!);
    }
    
    // 清除分类和笔记缓存
    apiCache.clearPattern(`categories_${authResult.userId!}`);
    apiCache.clearPattern(`notes_${authResult.userId!}`);
    
    return NextResponse.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('更新分类错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const categoryId = parseInt(params.id);
    const db = PostgresOngwuDatabase.getInstance();
    const success = await db.deleteCategory(categoryId, authResult.userId!);
    
    if (!success) {
      return NextResponse.json(
        { success: false, message: '分类不存在' },
        { status: 404 }
      );
    }
    
    // 重置ID序列，让新分类从1开始
    // 暂时禁用，避免生产环境500错误
    try {
      await db.resetSequences();
    } catch (resetError) {
      console.error('重置序列时出错，但不影响删除操作:', resetError);
      // 不抛出错误，继续执行删除操作
    }
    
    // 清除分类和笔记缓存
    apiCache.clearPattern(`categories_${authResult.userId!}`);
    apiCache.clearPattern(`notes_${authResult.userId!}`);
    
    return NextResponse.json({
      success: true,
      message: '分类已删除'
    });
  } catch (error) {
    console.error('删除分类错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
