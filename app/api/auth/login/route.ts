// Ongwu笔记登录API
import { NextRequest, NextResponse } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { OngwuAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const db = PostgresOngwuDatabase.getInstance();
    const auth = new OngwuAuth(db, process.env.ONGWU_NOTE_JWT_SECRET || 'default-secret');

    const result = await auth.login(username, password);

    if (result.success) {
      const response = NextResponse.json({
        success: true,
        user: {
          id: result.user!.id,
          username: result.user!.username
        },
        token: result.token
      });

      // 设置HTTP-only cookie
      response.cookies.set('ongwu_token', result.token!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7天
      });

      return response;
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('登录API错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
