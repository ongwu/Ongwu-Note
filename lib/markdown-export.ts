// Markdown导出工具
import fs from 'fs';
import path from 'path';
import { PostgresOngwuDatabase } from './postgres-db';

export class MarkdownExporter {
  private db: PostgresOngwuDatabase;
  private exportDir: string;

  constructor() {
    this.db = PostgresOngwuDatabase.getInstance();
    this.exportDir = path.join(process.cwd(), 'exports');
    console.log('MarkdownExporter constructor - exportDir:', this.exportDir);
    this.ensureExportDir();
  }

  private ensureExportDir() {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  // 导出单个笔记为Markdown
  async exportNote(noteId: number, userId: number): Promise<string> {
    const note = await this.db.getNoteById(noteId, userId);
    if (!note) {
      throw new Error('笔记不存在');
    }

    const categories = await this.db.getCategoriesByUserId(userId);
    const category = categories.find(cat => cat.id === note.category_id);
    
    const markdown = this.formatNoteAsMarkdown(note, category);
    const filename = this.sanitizeFilename(note.title) + '.md';
    const filepath = path.join(this.exportDir, filename);
    
    fs.writeFileSync(filepath, markdown, 'utf8');
    return filepath;
  }

  // 导出用户所有笔记
  async exportAllNotes(userId: number): Promise<string> {
    try {
      console.log('MarkdownExporter exportAllNotes - 开始导出所有笔记, userId:', userId);
      
      const notes = await this.db.getNotesByUserId(userId);
      console.log('MarkdownExporter exportAllNotes - 获取到笔记数量:', notes.length);
      
      const categories = await this.db.getCategoriesByUserId(userId);
      console.log('MarkdownExporter exportAllNotes - 获取到分类数量:', categories.length);
      
      const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
      
      // 按分类组织笔记
      const notesByCategory = new Map<number | null, any[]>();
      notes.forEach((note: any) => {
        const categoryId = note.category_id;
        if (!notesByCategory.has(categoryId)) {
          notesByCategory.set(categoryId, []);
        }
        notesByCategory.get(categoryId)!.push(note);
      });

      let markdown = `# Ongwu笔记导出\n\n`;
      markdown += `**导出时间**: ${new Date().toLocaleString('zh-CN')}\n`;
      markdown += `**总笔记数**: ${notes.length}\n\n`;

      // 按分类导出
      notesByCategory.forEach((categoryNotes: any[], categoryId: number | null) => {
        const category = categoryId ? categoryMap.get(categoryId) : null;
        const categoryName = category ? category.name : '未分类';
        
        markdown += `## ${categoryName}\n\n`;
        
        categoryNotes.forEach((note: any) => {
          markdown += `### ${note.title}\n\n`;
          markdown += `**创建时间**: ${new Date(note.created_at).toLocaleString('zh-CN')}\n`;
          markdown += `**更新时间**: ${new Date(note.updated_at).toLocaleString('zh-CN')}\n\n`;
          markdown += `${note.content}\n\n`;
          markdown += `---\n\n`;
        });
      });

      const filename = `ongwu_notes_${new Date().toISOString().split('T')[0]}.md`;
      const filepath = path.join(this.exportDir, filename);
      
      console.log('MarkdownExporter exportAllNotes - 准备写入文件:', filepath);
      fs.writeFileSync(filepath, markdown, 'utf8');
      console.log('MarkdownExporter exportAllNotes - 文件写入成功');
      
      return filepath;
    } catch (error) {
      console.error('MarkdownExporter exportAllNotes - 导出失败:', error);
      throw error;
    }
  }

  // 导出分类笔记
  async exportCategoryNotes(categoryId: number, userId: number): Promise<string> {
    const notes = await this.db.getNotesByCategoryId(categoryId, userId);
    const categories = await this.db.getCategoriesByUserId(userId);
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!category) {
      throw new Error('分类不存在');
    }

    let markdown = `# ${category.name}\n\n`;
    markdown += `**分类描述**: ${category.description || '无描述'}\n`;
    markdown += `**导出时间**: ${new Date().toLocaleString('zh-CN')}\n`;
    markdown += `**笔记数量**: ${notes.length}\n\n`;

    notes.forEach(note => {
      markdown += `## ${note.title}\n\n`;
      markdown += `**创建时间**: ${new Date(note.created_at).toLocaleString('zh-CN')}\n`;
      markdown += `**更新时间**: ${new Date(note.updated_at).toLocaleString('zh-CN')}\n\n`;
      markdown += `${note.content}\n\n`;
      markdown += `---\n\n`;
    });

    const filename = this.sanitizeFilename(category.name) + '_notes.md';
    const filepath = path.join(this.exportDir, filename);
    
    fs.writeFileSync(filepath, markdown, 'utf8');
    return filepath;
  }

  // 格式化单个笔记为Markdown
  private formatNoteAsMarkdown(note: any, category: any): string {
    let markdown = `# ${note.title}\n\n`;
    
    if (category) {
      markdown += `**分类**: ${category.name}\n`;
    }
    
    markdown += `**创建时间**: ${new Date(note.created_at).toLocaleString('zh-CN')}\n`;
    markdown += `**更新时间**: ${new Date(note.updated_at).toLocaleString('zh-CN')}\n\n`;
    markdown += `---\n\n`;
    markdown += `${note.content}\n`;
    
    return markdown;
  }

  // 清理文件名
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }

  // 获取导出文件列表
  getExportFiles(): string[] {
    try {
      return fs.readdirSync(this.exportDir)
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(this.exportDir, file));
    } catch (error) {
      return [];
    }
  }

  // 删除导出文件
  deleteExportFile(filename: string): boolean {
    try {
      const filepath = path.join(this.exportDir, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}
