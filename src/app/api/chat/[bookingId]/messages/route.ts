import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/chat/[bookingId]/messages
 * 获取指定 booking 的聊天历史消息
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

    // 验证 booking 存在且当前用户有权访问
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status, scheduled_at, scheduled_date, scheduled_time, duration_minutes, timezone, service_id, total_amount, currency, is_first_time')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 检查权限：用户本人或该订单的师傅
    const masterInfo = getMasterByEmail(user.email || '');
    const isUser = booking.user_id === user.id;
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;

    if (!isUser && !isMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 检查订单状态是否允许聊天
    if (booking.status === 'cancelled' || booking.status === 'refunded') {
      return NextResponse.json({ error: 'Booking is cancelled' }, { status: 400 });
    }
    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Booking not paid' }, { status: 400 });
    }

    // 查询消息
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch messages error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: messages || [], booking });
  } catch (error: any) {
    console.error('Chat messages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/[bookingId]/messages
 * 发送聊天消息
 */
export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;
    const body = await request.json();
    const { content, image_url } = body;

    if (!content && !image_url) {
      return NextResponse.json(
        { error: 'Message must have content or image' },
        { status: 400 }
      );
    }

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证 booking 存在
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status, scheduled_at, duration_minutes')
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

    // 检查订单状态是否允许发送消息
    // 允许状态：confirmed（已接单）, in_progress（进行中）
    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Booking is not ready for chat', currentStatus: booking.status },
        { status: 400 }
      );
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Booking not paid' }, { status: 400 });
    }

    // 检查是否已超时（咨询时间结束）
    if (booking.scheduled_at && booking.duration_minutes) {
      const endTime = new Date(booking.scheduled_at).getTime() + booking.duration_minutes * 60 * 1000;
      if (Date.now() > endTime) {
        return NextResponse.json({ error: 'Consultation time has ended' }, { status: 400 });
      }
    }

    // 状态由时间驱动，不在发消息时自动变更
    // confirmed / in_progress 均可发消息，前端根据时间显示正确状态

    // 获取发送者名称
    const senderName = isMaster
      ? masterInfo?.name || 'Master'
      : user.user_metadata?.full_name || user.email || 'User';

    // 插入消息
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        sender_type: isMaster ? 'master' : 'user',
        sender_name: senderName,
        content: content || null,
        image_url: image_url || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert message error:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message', message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    console.error('Send message API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
