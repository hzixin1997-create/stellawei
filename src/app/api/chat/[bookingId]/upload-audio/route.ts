import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat/[bookingId]/upload-audio
 * 上传语音消息
 */
export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const duration = formData.get('duration') as string;

    if (!file) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 生成唯一文件名
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'webm';
    const fileName = `${bookingId}/${timestamp}.${fileExt}`;

    // 上传到 chat-images bucket（复用同一个 bucket）
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, {
        contentType: file.type || 'audio/webm',
        upsert: false,
      });

    if (uploadError) {
      console.error('Audio upload error:', uploadError);
      return NextResponse.json(
        { error: 'Upload failed', message: uploadError.message },
        { status: 500 }
      );
    }

    // 获取公开 URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      audio_url: publicUrl,
      duration: parseInt(duration) || 0,
    });
  } catch (error: any) {
    console.error('Upload audio API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
