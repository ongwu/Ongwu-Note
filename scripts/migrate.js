#!/usr/bin/env node

// Ongwu笔记PostgreSQL数据库迁移脚本
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const pool = new Pool({
  host: process.env.ONGWU_NOTE_DB_HOST || 'aws-1-us-east-1.pooler.supabase.com',
  port: parseInt(process.env.ONGWU_NOTE_DB_PORT || '5432'),
  database: process.env.ONGWU_NOTE_DB_NAME || 'postgres',
  user: process.env.ONGWU_NOTE_DB_USER || 'postgres.radviydaixphjzbdmnhc',
  password: process.env.ONGWU_NOTE_DB_PASSWORD || 'Xiaozhuang006..',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 开始执行数据库迁移...');
    
    // 读取SQL文件
    const sqlPath = path.join(__dirname, '..', 'schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // 将SQLite语法转换为PostgreSQL语法
    const postgresSQL = sqlContent
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
      .replace(/INSERT OR IGNORE INTO/g, 'INSERT INTO')
      .replace(/\$2a\$10\$rQZ8K9LmN2pO3qR4sT5uVeWxYzA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6/g, '$2a$10$yDkLo9T6bmVz1RS/.6zMd.fiMzkaRpB4URv2Lgr0jjdvGQVPF8Ngi');
    
    // 分割SQL语句并执行
    const statements = postgresSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`执行: ${statement.substring(0, 50)}...`);
        await client.query(statement);
      }
    }
    
    console.log('✅ 数据库迁移完成！');
    
    // 验证表是否创建成功
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'ongwu_%'
    `);
    
    console.log('📋 创建的表:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行迁移
runMigration().catch(console.error);
