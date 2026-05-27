import { NextRequest, NextResponse } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { authenticateRequest } from '@/lib/auth-middleware';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    if (!UUID_PATTERN.test(params.id)) {
      return NextResponse.json(
        { success: false, message: '资源ID无效' },
        { status: 400 }
      );
    }

    const db = PostgresOngwuDatabase.getInstance();
    const asset = await db.getNoteAssetById(params.id, authResult.userId!);

    if (!asset?.file_data) {
      return NextResponse.json(
        { success: false, message: '图片不存在' },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(asset.file_data), {
      headers: {
        'Content-Type': asset.mime_type,
        'Content-Length': String(asset.file_size),
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('读取图片错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
