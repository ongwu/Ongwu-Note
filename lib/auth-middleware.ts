// 优化的认证中间件
import { NextRequest } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { OngwuAuth } from '@/lib/auth';
import { jwtCache } from '@/lib/jwt-cache';
import { perfMonitor } from '@/lib/performance-monitor';

export async function verifyTokenWithCache(token: string) {
  return await perfMonitor.measure('JWT验证', async () => {
    try {
      // 首先检查JWT缓存
      const cachedResult = jwtCache.get(token);
      if (cachedResult) {
        return {
          success: true,
          userId: cachedResult.userId,
          username: cachedResult.username
        };
      }

      // 缓存未命中，进行实际验证
      const db = PostgresOngwuDatabase.getInstance();
      const auth = new OngwuAuth(db, process.env.ONGWU_NOTE_JWT_SECRET || 'default-secret');
      
      const tokenResult = await auth.verifyToken(token);
      
      if (tokenResult.success && tokenResult.userId) {
        // 验证成功，缓存结果（30秒）
        jwtCache.set(token, tokenResult.userId, tokenResult.username || 'unknown', 30000);
      }
      
      return tokenResult;
    } catch (error) {
      console.error('JWT验证错误:', error);
      return {
        success: false,
        message: 'JWT验证失败'
      };
    }
  });
}

export async function authenticateRequest(request: NextRequest) {
  try {
    const token = request.cookies.get('ongwu_token')?.value;
    
    if (!token) {
      return {
        success: false,
        message: '未登录',
        status: 401
      };
    }

    const tokenResult = await verifyTokenWithCache(token);
    
    if (!tokenResult.success || !('userId' in tokenResult) || !tokenResult.userId) {
      return {
        success: false,
        message: 'Token无效',
        status: 401
      };
    }

    return {
      success: true,
      userId: tokenResult.userId,
      username: tokenResult.username
    };
  } catch (error) {
    console.error('认证请求错误:', error);
    return {
      success: false,
      message: '认证失败',
      status: 500
    };
  }
}
