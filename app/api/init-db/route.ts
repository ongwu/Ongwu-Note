// Ongwu笔记 - 数据库初始化API
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// 数据库连接配置
// 添加临时日志记录环境变量值，用于调试
console.log('环境变量检查 - 当前环境:', process.env.NODE_ENV);
console.log('环境变量检查 - DB_HOST:', process.env.ONGWU_NOTE_DB_HOST || '未设置');
console.log('环境变量检查 - DB_PORT:', process.env.ONGWU_NOTE_DB_PORT || '未设置');
console.log('环境变量检查 - DB_NAME:', process.env.ONGWU_NOTE_DB_NAME || '未设置');
console.log('环境变量检查 - DB_USER:', process.env.ONGWU_NOTE_DB_USER ? '已设置(部分隐藏)' : '未设置');
console.log('环境变量检查 - DB_PASSWORD:', process.env.ONGWU_NOTE_DB_PASSWORD ? '已设置(部分隐藏)' : '未设置');

const pool = new Pool({
  host: process.env.ONGWU_NOTE_DB_HOST || 'localhost',
  port: parseInt(process.env.ONGWU_NOTE_DB_PORT || '5432'),
  database: process.env.ONGWU_NOTE_DB_NAME || 'ongwu_note',
  user: process.env.ONGWU_NOTE_DB_USER || 'postgres',
  password: process.env.ONGWU_NOTE_DB_PASSWORD || '',
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    // 首先创建系统状态表（如果不存在）
    await client.query(`
      CREATE TABLE IF NOT EXISTS ongwu_system_status (
        id SERIAL PRIMARY KEY,
        is_initialized BOOLEAN DEFAULT FALSE,
        initialized_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 检查系统初始化状态
    let systemStatus;
    try {
      systemStatus = await client.query(
        'SELECT * FROM ongwu_system_status LIMIT 1'
      );
    } catch (error) {
      // 如果查询失败，插入初始记录
      await client.query(`
        INSERT INTO ongwu_system_status (is_initialized, initialized_at) 
        VALUES (false, null)
      `);
      systemStatus = { rows: [{ is_initialized: false }] };
    }

    let isSystemInitialized = false;
    if (systemStatus.rows.length > 0) {
      isSystemInitialized = systemStatus.rows[0].is_initialized;
    } else {
      // 如果系统状态表为空，插入初始记录
      await client.query(`
        INSERT INTO ongwu_system_status (is_initialized, initialized_at) 
        VALUES (false, null)
      `);
    }

    // 检查是否有任何用户存在（如果用户表存在的话）
    let hasUsers = false;
    try {
      const userCount = await client.query('SELECT COUNT(*) as count FROM ongwu_users');
      hasUsers = parseInt(userCount.rows[0].count) > 0;
    } catch (error) {
      // 用户表不存在，说明还没有初始化过
      hasUsers = false;
    }

    // 如果系统已初始化或有用户存在，禁止重新初始化
    if (isSystemInitialized || hasUsers) {
      return NextResponse.json({
        success: false,
        message: '数据库已经初始化过了！无法重复初始化。',
        alreadyInitialized: true,
        reason: isSystemInitialized ? '系统已标记为初始化' : '系统中已存在用户'
      }, { status: 400 });
    }
    
    // 创建用户表
    await client.query(`
      CREATE TABLE IF NOT EXISTS ongwu_users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建分类表
    await client.query(`
      CREATE TABLE IF NOT EXISTS ongwu_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES ongwu_users(id) ON DELETE CASCADE
      )
    `);

    // 创建笔记表
    await client.query(`
      CREATE TABLE IF NOT EXISTS ongwu_notes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category_id INTEGER,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (category_id) REFERENCES ongwu_categories(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES ongwu_users(id) ON DELETE CASCADE
      )
    `);

    // 创建索引
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ongwu_notes_user_id ON ongwu_notes(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ongwu_notes_category_id ON ongwu_notes(category_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ongwu_categories_user_id ON ongwu_categories(user_id)
    `);
    // 添加软删除相关索引
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ongwu_notes_deleted_at ON ongwu_notes(deleted_at)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ongwu_categories_deleted_at ON ongwu_categories(deleted_at)
    `);

    // 为现有表添加 deleted_at 字段（如果不存在）
    try {
      await client.query(`
        ALTER TABLE ongwu_categories 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
      `);
    } catch (error) {
      // 分类表 deleted_at 字段可能已存在
    }

    try {
      await client.query(`
        ALTER TABLE ongwu_notes 
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
      `);
    } catch (error) {
      // 笔记表 deleted_at 字段可能已存在
    }

    // 为 deleted_at 字段添加索引（如果不存在）
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ongwu_notes_deleted_at ON ongwu_notes(deleted_at)
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ongwu_categories_deleted_at ON ongwu_categories(deleted_at)
      `);
    } catch (error) {
      // 软删除索引可能已存在
    }

    // 生成随机密码
    const randomPassword = Math.random().toString(36).slice(-8); // 生成8位随机密码
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    // 创建管理员用户
    const adminResult = await client.query(`
      INSERT INTO ongwu_users (username, password_hash, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW()) RETURNING id
    `, ['admin', passwordHash]);
    const adminUserId = adminResult.rows[0].id;

    // 创建默认分类
    const defaultCategories = [
      { name: '生活记录', description: '记录日常生活的点点滴滴' },
      { name: '工作笔记', description: '工作中的重要记录和想法' },
      { name: '学习笔记', description: '学习过程中的知识点和心得' },
      { name: '想法灵感', description: '随时记录的想法和灵感' }
    ];

    for (let i = 0; i < defaultCategories.length; i++) {
      const category = defaultCategories[i];
      // 检查分类是否已存在
      const existingCategory = await client.query(
        'SELECT id FROM ongwu_categories WHERE name = $1 AND user_id = $2',
        [category.name, adminUserId]
      );

      if (existingCategory.rows.length === 0) {
        await client.query(`
          INSERT INTO ongwu_categories (name, description, user_id, sort_order, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [category.name, category.description, adminUserId, i + 1]);
      }
    }

    // 更新系统状态为已初始化
    await client.query(`
      UPDATE ongwu_system_status 
      SET is_initialized = true, initialized_at = NOW(), updated_at = NOW()
    `);

    // 验证表是否创建成功
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'ongwu_%'
    `);

    const tables = tablesResult.rows.map(row => row.table_name);

    return NextResponse.json({
      success: true,
      message: '数据库初始化成功！',
      tables: tables,
      adminUser: {
        username: 'admin',
        password: randomPassword
      }
    });

  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '数据库初始化失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    // 检查表是否存在
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'ongwu_%'
    `);

    const tables = tablesResult.rows.map(row => row.table_name);

    // 检查系统初始化状态
    let isSystemInitialized = false;
    let initializedAt = null;
    
    try {
      const systemStatus = await client.query(
        'SELECT is_initialized, initialized_at FROM ongwu_system_status LIMIT 1'
      );
      if (systemStatus.rows.length > 0) {
        isSystemInitialized = systemStatus.rows[0].is_initialized;
        initializedAt = systemStatus.rows[0].initialized_at;
      }
    } catch (error) {
      // 系统状态表可能不存在，使用表数量作为备用检查
    }

    // 检查用户数量
    let userCount = 0;
    try {
      const userCountResult = await client.query('SELECT COUNT(*) as count FROM ongwu_users');
      userCount = parseInt(userCountResult.rows[0].count) || 0;
    } catch (error) {
      // 用户表不存在或查询失败
    }

    return NextResponse.json({
      success: true,
      tables: tables,
      isInitialized: isSystemInitialized || (tables.length >= 3 && userCount > 0),
      systemStatus: {
        isInitialized: isSystemInitialized,
        initializedAt: initializedAt,
        userCount: userCount
      }
    });

  } catch (error) {
    console.error('❌ 检查数据库状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '检查数据库状态失败',
        error: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
