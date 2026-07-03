import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { getMessage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * POST /api/master/send-message
 * 师傅给客户发送消息（通过 booking 的聊天系统）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, content, image_url, message_source = 'follow_up' } = body;

    if (!bookingId || (!content?.trim() && !image_url)) {
      return NextResponse.json(
        { error: 'Missing required parameters: bookingId, content or image_url' },
        { status: 400 }
      );
    }

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    // 使用白名单获取师傅信息
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 1. 验证 booking 属于这个师傅
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, master_id, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: getMessage('BOOKING_NOT_FOUND', request) }, { status: 404 });
    }

    if (booking.master_id !== masterInfo.slug) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    // 2. 如果是留言咨询回复，检查师傅回复次数限制
    if (message_source === 'order_reply') {
      const { data: masterReplies, error: countError } = await supabase
        .from('messages')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('sender_type', 'master')
        .eq('source', 'order_reply');

      if (countError) {
        console.error('Count master replies error:', countError);
        return NextResponse.json({ error: 'Failed to count replies' }, { status: 500 });
      }

      const MAX_REPLIES = 3;
      const usedCount = masterReplies?.length || 0;
      if (usedCount >= MAX_REPLIES) {
        return NextResponse.json(
          { error: 'Reply limit reached', code: 'LIMIT_REACHED', used: usedCount, max: MAX_REPLIES },
          { status: 400 }
        );
      }
    }

    // 3. 插入消息
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        sender_type: 'master',
        sender_name: masterInfo.name || 'Master',
        content: content?.trim() || null,
        image_url: image_url || null,
        source: message_source,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json(
        { error: getMessage('SEND_FAILED', request), message: msgError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}