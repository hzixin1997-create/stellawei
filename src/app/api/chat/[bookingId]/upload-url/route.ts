import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat/[bookingId]/upload-url
 * 生成 Supabase Storage 预签名上传 URL，支持前端直传
 * 绕过 Vercel API 中转，解决大文件/弱网上传超时问题
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

    // 检查权限
    const masterInfo = getMasterByEmail(user.email || '');
    const isUser = booking.user_id === user.id;
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;

    if (!isUser && !isMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 用户端：只允许 confirmed / in_progress 状态
    if (isUser && !['confirmed', 'in_progress'].includes(booking.status)) {
      return NextResponse.json({ error: 'Booking is not ready for chat' }, { status: 400 });
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Booking not paid' }, { status: 400 });
    }

    // 获取请求体中的文件名和类型
    const body = await request.json().catch(() => ({}));
    const fileExt = body.fileExt || 'jpg';
    const fileName = `${bookingId}/${Date.now()}.${fileExt}`;

    // 生成预签名上传 URL（60秒有效期）
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('chat-images')
      .createSignedUploadUrl(fileName);

    if (signedUrlError || !signedUrlData) {
      console.error('[upload-url] createSignedUploadUrl error:', signedUrlError);
      return NextResponse.json(
        { error: 'Failed to generate upload URL', message: signedUrlError?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedUrlData.signedUrl,
      token: signedUrlData.token,
      path: fileName,
    });
  } catch (error: any) {
    console.error('Upload URL API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
