// Ongwu笔记 - Markdown导出API
import { NextRequest, NextResponse } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { authenticateRequest } from '@/lib/auth-middleware';
import JSZip from 'jszip';

// 清理文件名，确保HTTP头部兼容
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s.-]/g, '') // 只保留字母、数字、空格、点、横线
    .replace(/\s+/g, '_') // 空格替换为下划线
    .substring(0, 100); // 限制长度
}

export async function POST(request: NextRequest) {
  try {
    // 使用优化的认证中间件
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.error('API POST /api/export - 认证失败:', authResult.message);
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const { type, categoryId } = await request.json();
    
    // 直接使用文件数据库，避免复杂的导出工具
    const db = PostgresOngwuDatabase.getInstance();
    let notes;
    let categories;
    
    if (type === 'category' && categoryId) {
      // 只导出指定分类的笔记
      notes = await db.getNotesByCategoryId(categoryId, authResult.userId!);
      categories = await db.getCategoriesByUserId(authResult.userId!);
    } else {
      // 导出所有笔记
      notes = await db.getNotesByUserId(authResult.userId!);
      categories = await db.getCategoriesByUserId(authResult.userId!);
    }
    
    // 创建ZIP压缩包
    const zip = new JSZip();
    
    // 按分类组织笔记
    const notesByCategory = new Map();
    
    for (const note of notes) {
      const category = categories.find(cat => cat.id === note.category_id);
      const categoryName = category ? category.name : '未分类';
      
      if (!notesByCategory.has(categoryName)) {
        notesByCategory.set(categoryName, []);
      }
      notesByCategory.get(categoryName).push(note);
    }
    
    // 为每个分类创建文件夹并添加笔记文件
    for (const [categoryName, categoryNotes] of notesByCategory) {
      const categoryFolder = zip.folder(categoryName);
      
      for (const note of categoryNotes) {
        // 生成单篇笔记的Markdown内容
        let markdown = `# ${note.title}\n\n`;
        markdown += `**分类**: ${categoryName}\n`;
        markdown += `**创建时间**: ${new Date(note.created_at).toLocaleString('zh-CN')}\n`;
        markdown += `**更新时间**: ${new Date(note.updated_at).toLocaleString('zh-CN')}\n\n`;
        markdown += `---\n\n`;
        markdown += `${note.content}\n`;
        
        // 生成文件名（清理特殊字符）
        const cleanTitle = note.title
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, '_')
          .substring(0, 50);
        const filename = `${cleanTitle}_${note.id}.md`;
        
        // 添加到ZIP文件夹中
        categoryFolder?.file(filename, markdown);
      }
    }
    
    // 生成ZIP文件
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    // 生成ZIP文件名（使用英文，避免编码问题）
    const timestamp = new Date().toISOString().split('T')[0];
    let zipFilename: string;
    
    if (type === 'category') {
      const categoryName = notesByCategory.keys().next().value;
      // 将中文分类名转换为拼音或英文
      const categoryMap: { [key: string]: string } = {
        '工作笔记': 'work_notes',
        '学习笔记': 'study_notes', 
        '生活记录': 'life_records',
        '未分类': 'uncategorized'
      };
      const categoryKey = categoryMap[categoryName] || sanitizeFilename(categoryName);
      zipFilename = `ongwu_notes_${categoryKey}_${timestamp}.zip`;
    } else {
      zipFilename = `ongwu_notes_all_${timestamp}.zip`;
    }
    
    // 确保文件名安全
    zipFilename = sanitizeFilename(zipFilename);
    
    // 返回ZIP文件
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('API POST /api/export - 导出失败:', error);
    return NextResponse.json(
      { success: false, message: `导出失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}

