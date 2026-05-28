import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
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

    // 鉴权（用 service client 直接验证 token，减少一次 client 创建）
    const supabase = createServiceClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 验证 booking 存在且当前用户有权访问
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status, scheduled_at, scheduled_date, scheduled_time, duration_minutes, timezone, service_id, total_amount, currency, is_first_time, user_typing_until, master_typing_until, review_requested, review_data')
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
    console.log('[chat:GET] querying messages for booking:', bookingId);
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    console.log('[chat:GET] query result:', { count: messages?.length || 0, error: error?.message || null });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch messages', message: error.message },
        { status: 500 }
      );
    }

    // 标记对方消息为已读（当前用户查看时，将对方发送的未读消息标记为已读）
    const oppositeSenderType = isMaster ? 'user' : 'master';
    const unreadMessages = (messages || []).filter(
      (m) => m.sender_type === oppositeSenderType && !m.read_at
    );

    if (unreadMessages.length > 0) {
      const unreadIds = unreadMessages.map((m) => m.id);
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
    }

    // 返回 typing 状态
    const now = new Date().toISOString();
    const isUserTyping = booking.user_typing_until && booking.user_typing_until > now;
    const isMasterTyping = booking.master_typing_until && booking.master_typing_until > now;

    return NextResponse.json({
      messages: messages || [],
      booking,
      typing: {
        user: isUserTyping,
        master: isMasterTyping,
      },
    });
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
    const { content, image_url, audio_url, audio_duration } = body;

    if (!content && !image_url && !audio_url) {
      return NextResponse.json(
        { error: 'Message must have content, image, or audio' },
        { status: 400 }
      );
    }

    // 鉴权（用 service client 直接验证 token，减少一次 client 创建）
    const supabase = createServiceClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    // 用户端：只允许 confirmed / in_progress，且不能超时
    // 师傅端：只要不是 cancelled/refunded，随时可以发
    if (isUser) {
      if (!['confirmed', 'in_progress'].includes(booking.status)) {
        return NextResponse.json(
          { error: 'Booking is not ready for chat', currentStatus: booking.status },
          { status: 400 }
        );
      }
      // 检查是否已超时（咨询时间结束）
      if (booking.scheduled_at && booking.duration_minutes) {
        const endTime = new Date(booking.scheduled_at).getTime() + booking.duration_minutes * 60 * 1000;
        if (Date.now() > endTime) {
          return NextResponse.json({ error: 'Consultation time has ended' }, { status: 400 });
        }
      }
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Booking not paid' }, { status: 400 });
    }

    // 获取发送者名称
    const senderName = isMaster
      ? masterInfo?.name || 'Master'
      : user.user_metadata?.full_name || user.email || 'User';

    // 插入消息
    const insertPayload: any = {
      booking_id: bookingId,
      sender_id: user.id,
      sender_type: isMaster ? 'master' : 'user',
      sender_name: senderName,
      content: content || null,
      image_url: image_url || null,
      audio_url: audio_url || null,
      audio_duration: audio_duration != null ? audio_duration : null,
      source: 'chat',
    };

    console.log('[chat:POST] insert payload:', JSON.stringify(insertPayload));

    const { data: insertedRows, error: insertError } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select();

    console.log('[chat:POST] insert result:', { rowsCount: insertedRows?.length || 0, error: insertError?.message || null });

    if (insertError) {
      console.error('[chat:POST] Insert message error:', insertError);
      return NextResponse.json(
        { error: 'Failed to send message', message: insertError.message },
        { status: 500 }
      );
    }

    const message = insertedRows && insertedRows.length > 0 ? insertedRows[0] : null;

    if (!message) {
      console.error('[chat:POST] Insert succeeded but no row returned. Payload:', JSON.stringify(insertPayload));
      return NextResponse.json(
        { error: 'Failed to send message', message: 'Insert succeeded but no row returned' },
        { status: 500 }
      );
    }

    console.log('[chat:POST] returning message:', JSON.stringify({ id: message.id, created_at: message.created_at }));
    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
