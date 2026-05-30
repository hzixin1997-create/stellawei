import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat/[bookingId]/upload-image
 * 上传聊天图片到 Supabase Storage
 */
export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证 booking 存在且用户有权访问
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 检查权限：与 messages API 保持一致，使用 getMasterByEmail
    const masterInfo = getMasterByEmail(user.email || '');
    const isUser = booking.user_id === user.id;
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;

    if (!isUser && !isMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 用户端：只允许 confirmed / in_progress 状态
    // 师傅端：只要不是 cancelled/refunded 都可以
    if (isUser && !['confirmed', 'in_progress'].includes(booking.status)) {
      return NextResponse.json({ error: 'Booking is not ready for chat' }, { status: 400 });
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Booking not paid' }, { status: 400 });
    }

    // 获取上传的文件
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // 验证文件大小（最大 5MB）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // 生成文件名
    const fileExt = file.name.split('.').pop();
    const fileName = `${bookingId}/${Date.now()}.${fileExt}`;

    // 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image', message: uploadError.message },
        { status: 500 }
      );
    }

    // 获取 public URL
    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      image_url: urlData.publicUrl,
      path: fileName,
    });
  } catch (error: any) {
    console.error('Upload image API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
