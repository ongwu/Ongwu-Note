// Ongwu笔记认证系统
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IOngwuDatabase, OngwuUser } from './db';

export interface AuthResult {
  success: boolean;
  user?: OngwuUser;
  token?: string;
  message?: string;
}

export class OngwuAuth {
  private db: IOngwuDatabase;
  private jwtSecret: string;

  constructor(db: IOngwuDatabase, jwtSecret: string) {
    this.db = db;
    this.jwtSecret = jwtSecret;
  }

  // 用户登录
  async login(username: string, password: string): Promise<AuthResult> {
    try {
      const user = await this.db.getUserByUsername(username);
      
      if (!user) {
        return {
          success: false,
          message: '用户名或密码错误'
        };
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return {
          success: false,
          message: '用户名或密码错误'
        };
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          iat: Math.floor(Date.now() / 1000)
        },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        user,
        token
      };
    } catch (error) {
      console.error('登录错误:', error);
      return {
        success: false,
        message: '登录失败，请稍后重试'
      };
    }
  }

  // 用户注册
  async register(username: string, password: string): Promise<AuthResult> {
    try {
      // 检查用户名是否已存在
      const existingUser = await this.db.getUserByUsername(username);
      if (existingUser) {
        return {
          success: false,
          message: '用户名已存在'
        };
      }

      // 密码强度验证
      if (password.length < 6) {
        return {
          success: false,
          message: '密码长度至少6位'
        };
      }

      // 加密密码
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // 创建用户
      const user = await this.db.createUser(username, passwordHash);

      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          iat: Math.floor(Date.now() / 1000)
        },
        this.jwtSecret,
        { expiresIn: '7d' }
      );

      return {
        success: true,
        user,
        token
      };
    } catch (error) {
      console.error('注册错误:', error);
      return {
        success: false,
        message: '注册失败，请稍后重试'
      };
    }
  }

  // 验证JWT token
  async verifyToken(token: string): Promise<{ success: boolean; userId?: number; username?: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return {
        success: true,
        userId: decoded.userId,
        username: decoded.username
      };
    } catch (error) {
      return {
        success: false
      };
    }
  }

  // 生成密码哈希（用于初始化管理员账户）
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }
}
