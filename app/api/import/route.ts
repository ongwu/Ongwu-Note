// Ongwu笔记 - 文档导入API
import { NextRequest, NextResponse } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { authenticateRequest } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    // 使用优化的认证中间件
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.error('API POST /api/import - 认证失败:', authResult.message);
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const categoryId = formData.get('categoryId') as string;
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: '请选择要导入的文件' },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, message: '请选择目标分类' },
        { status: 400 }
      );
    }

    const db = PostgresOngwuDatabase.getInstance();
    const categoryIdNum = parseInt(categoryId);
    
    // 验证分类是否存在
    const categories = await db.getCategoriesByUserId(authResult.userId!);
    const targetCategory = categories.find(cat => cat.id === categoryIdNum);
    if (!targetCategory) {
      return NextResponse.json(
        { success: false, message: '目标分类不存在' },
        { status: 400 }
      );
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        // 检查文件类型
        if (!file.name.toLowerCase().endsWith('.md')) {
          results.push({
            filename: file.name,
            success: false,
            message: '只支持.md文件'
          });
          errorCount++;
          continue;
        }

        // 读取文件内容
        const content = await file.text();
        
        // 从文件名提取标题（去掉.md扩展名）
        const title = file.name.replace(/\.md$/i, '');
        
        // 创建笔记
        const note = await db.createNote(
          title,
          content,
          categoryIdNum,
          authResult.userId!
        );

        results.push({
          filename: file.name,
          success: true,
          message: '导入成功',
          noteId: note.id
        });
        successCount++;

      } catch (error) {
        console.error(`导入文件 ${file.name} 失败:`, error);
        results.push({
          filename: file.name,
          success: false,
          message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `导入完成！成功: ${successCount} 个，失败: ${errorCount} 个`,
      results,
      summary: {
        total: files.length,
        success: successCount,
        error: errorCount
      }
    });

  } catch (error) {
    console.error('API POST /api/import - 导入失败:', error);
    return NextResponse.json(
      { success: false, message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

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

    const db = PostgresOngwuDatabase.getInstance();
    const categories = await db.getCategoriesByUserId(authResult.userId!);

    return NextResponse.json({
      success: true,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name
      }))
    });

  } catch (error) {
    console.error('API GET /api/import 错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
