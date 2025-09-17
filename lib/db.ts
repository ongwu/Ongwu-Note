// Ongwu笔记数据库连接和操作
// import { Database } from '@cloudflare/workers-types';

export interface OngwuUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface OngwuCategory {
  id: number;
  name: string;
  description?: string;
  user_id: number;
  sort_order?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface OngwuNote {
  id: number;
  title: string;
  content: string;
  category_id?: number | null;
  user_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface OngwuSystemStatus {
  id: number;
  is_initialized: boolean;
  initialized_at: string | null;
  created_at: string;
  updated_at: string;
}

// 通用数据库接口
export interface IOngwuDatabase {
  getUserByUsername(username: string): Promise<OngwuUser | null>;
  getUserById(id: number): Promise<OngwuUser | null>;
  createUser(username: string, passwordHash: string): Promise<OngwuUser>;
  updateUser(id: number, updateData: Partial<OngwuUser>): Promise<boolean>;
  getCategoriesByUserId(userId: number): Promise<OngwuCategory[]>;
  createCategory(name: string, description: string, userId: number): Promise<OngwuCategory>;
  updateCategory(id: number, name: string, description: string, userId: number): Promise<OngwuCategory>;
  updateCategorySortOrder(categoryId: number, sortOrder: number, userId: number): Promise<boolean>;
  deleteCategory(id: number, userId: number): Promise<boolean>;
  softDeleteCategory(id: number, userId: number): Promise<boolean>;
  restoreCategory(id: number, userId: number): Promise<boolean>;
  getNotesByUserId(userId: number): Promise<OngwuNote[]>;
  getNotesByCategoryId(categoryId: number, userId: number): Promise<OngwuNote[]>;
  getNoteById(id: number, userId: number): Promise<OngwuNote | null>;
  createNote(title: string, content: string, categoryId: number | null, userId: number): Promise<OngwuNote>;
  updateNote(id: number, title: string, content: string, categoryId: number | null, userId: number): Promise<OngwuNote>;
  deleteNote(id: number, userId: number): Promise<boolean>;
  softDeleteNote(id: number, userId: number): Promise<boolean>;
  restoreNote(id: number, userId: number): Promise<boolean>;
  // 数据清理方法
  permanentlyDeleteOldRecords(daysOld: number): Promise<{ categories: number; notes: number }>;
  resetSequences(): Promise<void>;
  searchNotes(query: string, userId: number): Promise<OngwuNote[]>;
  // 系统状态相关方法
  getSystemStatus(): Promise<OngwuSystemStatus | null>;
  createSystemStatus(): Promise<OngwuSystemStatus>;
  updateSystemStatus(isInitialized: boolean): Promise<boolean>;
  getUserCount(): Promise<number>;
}

export class OngwuDatabase implements IOngwuDatabase {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  // 用户相关操作
  async getUserByUsername(username: string): Promise<OngwuUser | null> {
    const stmt = this.db.prepare('SELECT * FROM ongwu_users WHERE username = ?');
    const result = await stmt.bind(username).first();
    return result as OngwuUser | null;
  }

  async createUser(username: string, passwordHash: string): Promise<OngwuUser> {
    const stmt = this.db.prepare(`
      INSERT INTO ongwu_users (username, password_hash) 
      VALUES (?, ?) 
      RETURNING *
    `);
    const result = await stmt.bind(username, passwordHash).first();
    return result as OngwuUser;
  }

  async getUserById(id: number): Promise<OngwuUser | null> {
    const stmt = this.db.prepare('SELECT * FROM ongwu_users WHERE id = ?');
    const result = await stmt.bind(id).first();
    return result as OngwuUser | null;
  }

  async updateUser(id: number, updateData: Partial<OngwuUser>): Promise<boolean> {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'id' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      return false;
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE ongwu_users 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);
    const result = await stmt.bind(...values).run();
    return result.changes > 0;
  }

  // 分类相关操作
  async getCategoriesByUserId(userId: number): Promise<OngwuCategory[]> {
    const stmt = this.db.prepare('SELECT * FROM ongwu_categories WHERE user_id = ? AND deleted_at IS NULL ORDER BY name');
    const result = await stmt.bind(userId).all();
    return result.results as OngwuCategory[];
  }

  async createCategory(name: string, description: string, userId: number): Promise<OngwuCategory> {
    const stmt = this.db.prepare(`
      INSERT INTO ongwu_categories (name, description, user_id) 
      VALUES (?, ?, ?) 
      RETURNING *
    `);
    const result = await stmt.bind(name, description, userId).first();
    return result as OngwuCategory;
  }

  async updateCategory(id: number, name: string, description: string, userId: number): Promise<OngwuCategory> {
    const stmt = this.db.prepare(`
      UPDATE ongwu_categories 
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ? 
      RETURNING *
    `);
    const result = await stmt.bind(name, description, id, userId).first();
    return result as OngwuCategory;
  }

  async updateCategorySortOrder(categoryId: number, sortOrder: number, userId: number): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE ongwu_categories 
      SET sort_order = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `);
    const result = await stmt.bind(sortOrder, categoryId, userId).run();
    return result.changes > 0;
  }

  async deleteCategory(id: number, userId: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM ongwu_categories WHERE id = ? AND user_id = ?');
    const result = await stmt.bind(id, userId).run();
    return result.changes > 0;
  }

  async softDeleteCategory(id: number, userId: number): Promise<boolean> {
    const stmt = this.db.prepare('UPDATE ongwu_categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
    const result = await stmt.bind(id, userId).run();
    return result.changes > 0;
  }

  async restoreCategory(id: number, userId: number): Promise<boolean> {
    const stmt = this.db.prepare('UPDATE ongwu_categories SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL');
    const result = await stmt.bind(id, userId).run();
    return result.changes > 0;
  }

  // 笔记相关操作
  async getNotesByUserId(userId: number): Promise<OngwuNote[]> {
    const stmt = this.db.prepare(`
      SELECT n.*, c.name as category_name 
      FROM ongwu_notes n 
      LEFT JOIN ongwu_categories c ON n.category_id = c.id AND c.deleted_at IS NULL
      WHERE n.user_id = ? AND n.deleted_at IS NULL
      ORDER BY n.updated_at DESC
    `);
    const result = await stmt.bind(userId).all();
    return result.results as OngwuNote[];
  }

  async getNotesByCategoryId(categoryId: number, userId: number): Promise<OngwuNote[]> {
    const stmt = this.db.prepare(`
      SELECT n.*, c.name as category_name 
      FROM ongwu_notes n 
      LEFT JOIN ongwu_categories c ON n.category_id = c.id AND c.deleted_at IS NULL
      WHERE n.category_id = ? AND n.user_id = ? AND n.deleted_at IS NULL
      ORDER BY n.updated_at DESC
    `);
    const result = await stmt.bind(categoryId, userId).all();
    return result.results as OngwuNote[];
  }

  async getNoteById(id: number, userId: number): Promise<OngwuNote | null> {
    const stmt = this.db.prepare(`
      SELECT n.*, c.name as category_name 
      FROM ongwu_notes n 
      LEFT JOIN ongwu_categories c ON n.category_id = c.id AND c.deleted_at IS NULL
      WHERE n.id = ? AND n.user_id = ? AND n.deleted_at IS NULL
    `);
    const result = await stmt.bind(id, userId).first();
    return result as OngwuNote | null;
  }

  async createNote(title: string, content: string, categoryId: number | null, userId: number): Promise<OngwuNote> {
    const stmt = this.db.prepare(`
      INSERT INTO ongwu_notes (title, content, category_id, user_id) 
      VALUES (?, ?, ?, ?) 
      RETURNING *
    `);
    const result = await stmt.bind(title, content, categoryId, userId).first();
    return result as OngwuNote;
  }

  async updateNote(id: number, title: string, content: string, categoryId: number | null, userId: number): Promise<OngwuNote> {
    const stmt = this.db.prepare(`
      UPDATE ongwu_notes 
      SET title = ?, content = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ? 
      RETURNING *
    `);
    const result = await stmt.bind(title, content, categoryId, id, userId).first();
    return result as OngwuNote;
  }

  async deleteNote(id: number, userId: number): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM ongwu_notes WHERE id = ? AND user_id = ?');
    const result = await stmt.bind(id, userId).run();
    return result.changes > 0;
  }

  async softDeleteNote(id: number, userId: number): Promise<boolean> {
    const stmt = this.db.prepare('UPDATE ongwu_notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND deleted_at IS NULL');
    const result = await stmt.bind(id, userId).run();
    return result.changes > 0;
  }

  async restoreNote(id: number, userId: number): Promise<boolean> {
    const stmt = this.db.prepare('UPDATE ongwu_notes SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL');
    const result = await stmt.bind(id, userId).run();
    return result.changes > 0;
  }

  // 搜索笔记
  async searchNotes(query: string, userId: number): Promise<OngwuNote[]> {
    const stmt = this.db.prepare(`
      SELECT n.*, c.name as category_name 
      FROM ongwu_notes n 
      LEFT JOIN ongwu_categories c ON n.category_id = c.id AND c.deleted_at IS NULL
      WHERE n.user_id = ? AND n.deleted_at IS NULL AND (n.title LIKE ? OR n.content LIKE ?) 
      ORDER BY n.updated_at DESC
    `);
    const searchTerm = `%${query}%`;
    const result = await stmt.bind(userId, searchTerm, searchTerm).all();
    return result.results as OngwuNote[];
  }

  // 系统状态相关方法
  async getSystemStatus(): Promise<OngwuSystemStatus | null> {
    const stmt = this.db.prepare('SELECT * FROM ongwu_system_status LIMIT 1');
    const result = await stmt.first();
    return result as OngwuSystemStatus | null;
  }

  async createSystemStatus(): Promise<OngwuSystemStatus> {
    const stmt = this.db.prepare(`
      INSERT INTO ongwu_system_status (is_initialized, initialized_at) 
      VALUES (?, ?) 
      RETURNING *
    `);
    const result = await stmt.bind(false, null).first();
    return result as OngwuSystemStatus;
  }

  async updateSystemStatus(isInitialized: boolean): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE ongwu_system_status 
      SET is_initialized = ?, initialized_at = ?, updated_at = CURRENT_TIMESTAMP
    `);
    const result = await stmt.bind(isInitialized, isInitialized ? new Date().toISOString() : null).run();
    return result.changes > 0;
  }

  async getUserCount(): Promise<number> {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM ongwu_users');
    const result = await stmt.first();
    return result.count || 0;
  }

  // 数据清理方法
  async permanentlyDeleteOldRecords(daysOld: number): Promise<{ categories: number; notes: number }> {
    // 删除指定天数前的软删除记录
    const categoriesStmt = this.db.prepare(`
      DELETE FROM ongwu_categories 
      WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-${daysOld} days')
    `);
    const categoriesResult = await categoriesStmt.run();
    
    const notesStmt = this.db.prepare(`
      DELETE FROM ongwu_notes 
      WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-${daysOld} days')
    `);
    const notesResult = await notesStmt.run();

    return {
      categories: categoriesResult.changes || 0,
      notes: notesResult.changes || 0
    };
  }

  async resetSequences(): Promise<void> {
    // SQLite 中重置自增ID的方法
    // 注意：SQLite 不支持直接重置序列，但可以通过删除并重新创建表来实现
    // 这里我们使用 VACUUM 来优化数据库，清理未使用的空间
    await this.db.exec('VACUUM');
  }
}
