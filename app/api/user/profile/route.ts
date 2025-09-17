import { NextRequest, NextResponse } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { authenticateRequest } from '@/lib/auth-middleware';
import bcrypt from 'bcryptjs';

// 获取用户资料
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const db = PostgresOngwuDatabase.getInstance();
    const user = await db.getUserById(authResult.userId!);

    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    // 不返回密码
    const { password_hash, ...userWithoutPassword } = user;
    return NextResponse.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('获取用户资料错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}

// 更新用户资料
export async function PUT(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const { username, oldPassword, newPassword } = await request.json();

    if (!username || !oldPassword) {
      return NextResponse.json({ success: false, message: '用户名和原密码不能为空' }, { status: 400 });
    }

    const db = PostgresOngwuDatabase.getInstance();
    const user = await db.getUserById(authResult.userId!);

    if (!user) {
      return NextResponse.json({ success: false, message: '用户不存在' }, { status: 404 });
    }

    // 验证原密码
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isOldPasswordValid) {
      return NextResponse.json({ success: false, message: '原密码错误' }, { status: 400 });
    }

    // 检查用户名是否已被其他用户使用
    if (username !== user.username) {
      const existingUser = await db.getUserByUsername(username);
      if (existingUser && existingUser.id !== authResult.userId!) {
        return NextResponse.json({ success: false, message: '用户名已被使用' }, { status: 400 });
      }
    }

    // 准备更新数据
    const updateData: any = { username };
    
    // 如果提供了新密码，则更新密码
    if (newPassword && newPassword.trim() !== '') {
      if (newPassword.length < 6) {
        return NextResponse.json({ success: false, message: '新密码长度不能少于6位' }, { status: 400 });
      }
      updateData.password_hash = await bcrypt.hash(newPassword, 10);
    }

    // 更新用户信息
    const success = await db.updateUser(authResult.userId!, updateData);
    
    if (success) {
      return NextResponse.json({ success: true, message: '用户信息更新成功' });
    } else {
      return NextResponse.json({ success: false, message: '更新失败' }, { status: 500 });
    }
  } catch (error) {
    console.error('更新用户资料错误:', error);
    return NextResponse.json({ success: false, message: '服务器错误' }, { status: 500 });
  }
}