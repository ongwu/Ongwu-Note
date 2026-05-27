import { NextRequest, NextResponse } from 'next/server';
import { PostgresOngwuDatabase } from '@/lib/postgres-db';
import { authenticateRequest } from '@/lib/auth-middleware';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]);


function sanitizeFileName(fileName: string, mimeType: string) {
  const defaultExt = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const rawName = fileName && fileName !== 'image.png' ? fileName : `pasted-image-${Date.now()}.${defaultExt}`;
  return rawName.replace(/[^\w.\-\u4e00-\u9fa5]/g, '_').slice(0, 120);
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const noteIdValue = formData.get('noteId');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: '未找到上传图片' },
        { status: 400 }
      );
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, message: '仅支持 JPG、PNG、GIF、WebP 图片' },

        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { success: false, message: '图片不能超过 5MB' },
        { status: 400 }
      );
    }

    let noteId: number | null = null;
    if (typeof noteIdValue === 'string' && noteIdValue.trim() !== '') {
      const parsedNoteId = Number.parseInt(noteIdValue, 10);
      if (!Number.isFinite(parsedNoteId) || parsedNoteId <= 0) {
        return NextResponse.json(
          { success: false, message: '笔记ID无效' },
          { status: 400 }
        );
      }
      noteId = parsedNoteId;
    }

    const db = PostgresOngwuDatabase.getInstance();

    if (noteId !== null) {
      const note = await db.getNoteById(noteId, authResult.userId!);
      if (!note) {
        return NextResponse.json(
          { success: false, message: '笔记不存在' },
          { status: 404 }
        );
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await db.createNoteAsset(
      authResult.userId!,
      noteId,
      sanitizeFileName(file.name, file.type),
      file.type,
      file.size,
      buffer
    );

    return NextResponse.json({
      success: true,
      url: `/api/uploads/${asset.id}`,
      asset: {
        id: asset.id,
        fileName: asset.file_name,
        mimeType: asset.mime_type,
        fileSize: asset.file_size
      }
    });
  } catch (error) {
    console.error('上传图片错误:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
