// Ongwu笔记Token验证API
import { NextRequest, NextResponse } from 'next/server';
import { OngwuAuth } from '@/lib/auth';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('ongwu_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: '未登录' },
        { status: 401 }
      );
    }

    const db = PostgresOngwuDatabase.getInstance();
    const auth = new OngwuAuth(db, process.env.ONGWU_NOTE_JWT_SECRET || 'default-secret');

    const result = await auth.verifyToken(token);

    if (result.success) {
      return NextResponse.json({
        success: true,
        user: {
          id: result.userId,
          username: result.username
        }
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Token无效' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token验证错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
