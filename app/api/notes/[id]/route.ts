// Ongwu笔记 - 更新和删除笔记API
import { NextRequest, NextResponse } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { apiCache } from '@/lib/api-cache';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('API PUT /api/notes/[id] - 开始处理更新请求:', params.id);
    
    // 使用优化的认证中间件
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const noteId = parseInt(params.id);
    const { title, content, category_id } = await request.json();
    console.log('API PUT /api/notes/[id] - 解析参数:', { noteId, title, content: content?.substring(0, 50) + '...', category_id });
    
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { success: false, message: '标题不能为空' },
        { status: 400 }
      );
    }
    
    // 内容可以为空，但至少要有一个空字符串
    const noteContent = content || '';

    try {
      const db = PostgresOngwuDatabase.getInstance();
      
      // 先检查笔记是否存在
      const existingNote = await db.getNoteById(noteId, authResult.userId!);
      if (!existingNote) {
        console.error('API PUT /api/notes/[id] - 笔记不存在:', {
          noteId,
          userId: authResult.userId!,
          title,
          content: noteContent.substring(0, 50) + '...'
        });
        return NextResponse.json(
          { success: false, message: '笔记不存在或更新失败' },
          { status: 404 }
        );
      }
      
      const note = await db.updateNote(noteId, title, noteContent, category_id, authResult.userId!);
      
      // 清除笔记缓存
      apiCache.clearPattern(`notes_${authResult.userId!}`);
      
      return NextResponse.json({
        success: true,
        note
      });
    } catch (error) {
      console.error('更新笔记失败:', error);
      return NextResponse.json(
        { success: false, message: '笔记不存在或更新失败' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('更新笔记错误:', error);
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

    const noteId = parseInt(params.id);
    const db = new PostgresOngwuDatabase();
    const success = await db.deleteNote(noteId, authResult.userId!);
    
    if (!success) {
      return NextResponse.json(
        { success: false, message: '笔记不存在' },
        { status: 404 }
      );
    }
    
    // 重置ID序列，让新笔记从1开始
    // 暂时禁用，避免生产环境500错误
    try {
      await db.resetSequences();
    } catch (resetError) {
      console.error('重置序列时出错，但不影响删除操作:', resetError);
      // 不抛出错误，继续执行删除操作
    }
    
    // 清除笔记缓存
    apiCache.clearPattern(`notes_${authResult.userId!}`);
    
    return NextResponse.json({
      success: true,
      message: '笔记已删除'
    });
  } catch (error) {
    console.error('删除笔记错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
