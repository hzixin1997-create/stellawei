import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { exportKey, generateChatKey, importKey } from '@/lib/chatCrypto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/chat/[bookingId]/key
 * 获取或生成聊天加密密钥
 * 每个 booking 有独立的加密密钥，通过服务端安全分发
 */
export async function GET(
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

    // 验证 booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 权限检查
    const masterInfo = getMasterByEmail(user.email || '');
    const isUser = booking.user_id === user.id;
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;

    if (!isUser && !isMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 检查是否已有密钥
    const { data: existingKey } = await supabase
      .from('chat_keys')
      .select('key_encrypted')
      .eq('booking_id', bookingId)
      .single();

    if (existingKey?.key_encrypted) {
      return NextResponse.json({
        success: true,
        key: existingKey.key_encrypted,
      });
    }

    // 没有密钥，生成新的
    const key = await generateChatKey();
    const keyBase64 = await exportKey(key);

    // 存储到数据库（注意：这里存的是密钥本身，实际生产环境应该用更安全的方案）
    // 简化方案：直接存储密钥，但数据库有 RLS 保护
    await supabase
      .from('chat_keys')
      .upsert({
        booking_id: bookingId,
        key_encrypted: keyBase64,
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      key: keyBase64,
    });
  } catch (error: any) {
    console.error('Chat key API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
