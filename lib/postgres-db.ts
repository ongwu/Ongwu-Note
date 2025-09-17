// Ongwu笔记PostgreSQL数据库操作
import { Pool, PoolClient } from 'pg';
import { OngwuUser, OngwuCategory, OngwuNote, OngwuSystemStatus, IOngwuDatabase } from './db';

export class PostgresOngwuDatabase implements IOngwuDatabase {
  private pool: Pool;
  private static instance: PostgresOngwuDatabase;

  constructor() {
    const config = {
      host: process.env.ONGWU_NOTE_DB_HOST || 'localhost',
      port: parseInt(process.env.ONGWU_NOTE_DB_PORT || '5432'),
      database: process.env.ONGWU_NOTE_DB_NAME || 'ongwu_note',
      user: process.env.ONGWU_NOTE_DB_USER || 'postgres',
      password: process.env.ONGWU_NOTE_DB_PASSWORD || '',
      ssl: {
        rejectUnauthorized: false
      },
      max: 2,
      min: 0,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      acquireTimeoutMillis: 10000
    };
    
    this.pool = new Pool(config);
    
    // 添加连接错误处理
    this.pool.on('error', (err) => {
      console.error('PostgreSQL 连接池错误:', err);
    });
  }

  // 单例模式
  static getInstance(): PostgresOngwuDatabase {
    if (!PostgresOngwuDatabase.instance) {
      PostgresOngwuDatabase.instance = new PostgresOngwuDatabase();
    }
    return PostgresOngwuDatabase.instance;
  }


  // 用户相关操作
  async getUserByUsername(username: string): Promise<OngwuUser | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM ongwu_users WHERE username = $1',
        [username]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('PostgreSQL getUserByUsername 错误:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async createUser(username: string, passwordHash: string): Promise<OngwuUser> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO ongwu_users (username, password_hash) VALUES ($1, $2) RETURNING *',
        [username, passwordHash]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getUserById(id: number): Promise<OngwuUser | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM ongwu_users WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async updateUser(id: number, updateData: Partial<OngwuUser>): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (key !== 'id' && value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        return false;
      }

      fields.push(`updated_at = $${paramCount}`);
      values.push(new Date().toISOString());
      paramCount++;

      values.push(id);

      const query = `UPDATE ongwu_users SET ${fields.join(', ')} WHERE id = $${paramCount}`;
      const result = await client.query(query, values);
      
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  // 分类相关操作
  async getCategoriesByUserId(userId: number): Promise<OngwuCategory[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM ongwu_categories WHERE user_id = $1 ORDER BY sort_order ASC, name ASC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('PostgreSQL getCategoriesByUserId 错误:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async createCategory(name: string, description: string, userId: number): Promise<OngwuCategory> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO ongwu_categories (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
        [name, description, userId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('PostgreSQL createCategory - 创建失败:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateCategory(id: number, name: string, description: string, userId: number): Promise<OngwuCategory> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE ongwu_categories SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND user_id = $4 RETURNING *',
        [name, description, id, userId]
      );
      if (result.rows.length === 0) {
        throw new Error('Category not found');
      }
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteCategory(id: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM ongwu_categories WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async softDeleteCategory(id: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE ongwu_categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, userId]
      );
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async restoreCategory(id: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE ongwu_categories SET deleted_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL',
        [id, userId]
      );
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async updateCategorySortOrder(categoryId: number, sortOrder: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE ongwu_categories SET sort_order = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
        [sortOrder, categoryId, userId]
      );
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  // 笔记相关操作
  async getNotesByUserId(userId: number): Promise<OngwuNote[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT n.*, c.name as category_name 
        FROM ongwu_notes n 
        LEFT JOIN ongwu_categories c ON n.category_id = c.id
        WHERE n.user_id = $1
        ORDER BY n.updated_at DESC
      `, [userId]);
      return result.rows;
    } catch (error) {
      console.error('PostgreSQL getNotesByUserId 错误:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getNotesByCategoryId(categoryId: number, userId: number): Promise<OngwuNote[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT n.*, c.name as category_name 
        FROM ongwu_notes n 
        LEFT JOIN ongwu_categories c ON n.category_id = c.id
        WHERE n.category_id = $1 AND n.user_id = $2
        ORDER BY n.updated_at DESC
      `, [categoryId, userId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getNoteById(id: number, userId: number): Promise<OngwuNote | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT n.*, c.name as category_name 
        FROM ongwu_notes n 
        LEFT JOIN ongwu_categories c ON n.category_id = c.id
        WHERE n.id = $1 AND n.user_id = $2
      `, [id, userId]);
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async createNote(title: string, content: string, categoryId: number | null, userId: number): Promise<OngwuNote> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO ongwu_notes (title, content, category_id, user_id) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `, [title, content, categoryId, userId]);
      return result.rows[0];
    } catch (error) {
      console.error('PostgreSQL createNote - 创建失败:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async updateNote(id: number, title: string, content: string, categoryId: number | null, userId: number): Promise<OngwuNote> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        UPDATE ongwu_notes 
        SET title = $1, content = $2, category_id = $3, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4 AND user_id = $5 
        RETURNING *
      `, [title, content, categoryId, id, userId]);
      if (result.rows.length === 0) {
        throw new Error('Note not found');
      }
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async deleteNote(id: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM ongwu_notes WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async softDeleteNote(id: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE ongwu_notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [id, userId]
      );
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async restoreNote(id: number, userId: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'UPDATE ongwu_notes SET deleted_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL',
        [id, userId]
      );
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  // 搜索笔记
  async searchNotes(query: string, userId: number): Promise<OngwuNote[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT n.*, c.name as category_name 
        FROM ongwu_notes n 
        LEFT JOIN ongwu_categories c ON n.category_id = c.id
        WHERE n.user_id = $1 AND (n.title ILIKE $2 OR n.content ILIKE $2) 
        ORDER BY n.updated_at DESC
      `, [userId, `%${query}%`]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // 系统状态相关方法
  async getSystemStatus(): Promise<OngwuSystemStatus | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM ongwu_system_status LIMIT 1'
      );
      return result.rows[0] || null;
    } finally {
      client.release();
    }
  }

  async createSystemStatus(): Promise<OngwuSystemStatus> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO ongwu_system_status (is_initialized, initialized_at) 
        VALUES ($1, $2) 
        RETURNING *
      `, [false, null]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateSystemStatus(isInitialized: boolean): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        UPDATE ongwu_system_status 
        SET is_initialized = $1, initialized_at = $2, updated_at = CURRENT_TIMESTAMP
      `, [isInitialized, isInitialized ? new Date().toISOString() : null]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async getUserCount(): Promise<number> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT COUNT(*) as count FROM ongwu_users'
      );
      return parseInt(result.rows[0].count) || 0;
    } finally {
      client.release();
    }
  }

  // 数据清理方法
  async permanentlyDeleteOldRecords(daysOld: number): Promise<{ categories: number; notes: number }> {
    const client = await this.pool.connect();
    try {
      // 删除指定天数前的软删除记录
      const categoriesResult = await client.query(
        'DELETE FROM ongwu_categories WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL \'$1 days\'',
        [daysOld]
      );
      
      const notesResult = await client.query(
        'DELETE FROM ongwu_notes WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL \'$1 days\'',
        [daysOld]
      );

      return {
        categories: categoriesResult.rowCount || 0,
        notes: notesResult.rowCount || 0
      };
    } finally {
      client.release();
    }
  }

  async resetSequences(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // 检查序列是否存在，如果存在则重置
      const categoriesSeqExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_sequences 
          WHERE schemaname = 'public' AND sequencename = 'ongwu_categories_id_seq'
        )
      `);
      
      if (categoriesSeqExists.rows[0].exists) {
        await client.query(`
          SELECT setval('ongwu_categories_id_seq', COALESCE((SELECT MAX(id) FROM ongwu_categories), 0) + 1, false)
        `);
        console.log('✅ 分类序列已重置');
      }
      
      const notesSeqExists = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_sequences 
          WHERE schemaname = 'public' AND sequencename = 'ongwu_notes_id_seq'
        )
      `);
      
      if (notesSeqExists.rows[0].exists) {
        await client.query(`
          SELECT setval('ongwu_notes_id_seq', COALESCE((SELECT MAX(id) FROM ongwu_notes), 0) + 1, false)
        `);
        console.log('✅ 笔记序列已重置');
      }
    } catch (error) {
      console.error('重置序列时出错:', error);
      // 不抛出错误，避免影响删除操作
    } finally {
      client.release();
    }
  }

  // 关闭连接池
  async close(): Promise<void> {
    await this.pool.end();
  }
}
