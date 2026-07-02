import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getMasterByEmail } from '@/lib/master-auth';
import { getMessage, getLang } from '@/lib/i18n';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

/**
 * GET /api/chat/[bookingId]/messages
 * Voice Engine v1.0 - 获取指定 booking 的聊天历史消息
 */
export async function GET(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;
    const supabase = createServiceClient();
    const lang = getLang(request);

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    // 验证 booking 存在且当前用户有权访问
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status, scheduled_at, scheduled_date, scheduled_time, duration_minutes, timezone, service_id, total_amount, currency, is_first_time, user_typing_until, master_typing_until, review_requested, review_data')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('[chat:GET] Booking not found. Error:', bookingError)
      return NextResponse.json({ 
        error: getMessage('BOOKING_NOT_FOUND', request), 
        details: bookingError?.message,
        code: bookingError?.code,
      }, { status: 404 });
    }

    const masterInfo = getMasterByEmail(user.email || '');
    const isUser = booking.user_id === user.id;
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;

    if (!isUser && !isMaster) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_USER', request) }, { status: 403 });
    }

    if (booking.status === 'cancelled' || booking.status === 'refunded') {
      return NextResponse.json({ error: getMessage('CONSULTATION_ENDED', request) }, { status: 400 });
    }
    if (booking.payment_status !== 'paid' && booking.payment_status !== 'refund_requested') {
      return NextResponse.json({ error: getMessage('UNPAID_BOOKING', request) }, { status: 400 });
    }

    // 查询消息 - Voice Engine: 包含所有 audio 相关字段
    // 包含实时聊天和留言追问消息
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .or('source.eq.chat,source.eq.follow_up,source.is.null')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: getMessage('SEND_FAILED', request), message: error.message },
        { status: 500 }
      );
    }

    // 标记对方消息为已读
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

    const now = new Date().toISOString();
    const isUserTyping = booking.user_typing_until && booking.user_typing_until > now;
    const isMasterTyping = booking.master_typing_until && booking.master_typing_until > now;

    return NextResponse.json({
      messages: messages || [],
      booking,
      typing: { user: isUserTyping, master: isMasterTyping },
    });
  } catch (error: any) {
    console.error('Chat messages API error:', error);
    Sentry.captureException(error, {
      tags: { api: 'chat/messages', method: 'GET', component: 'chat' },
      extra: { bookingId: params?.bookingId },
    });
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/[bookingId]/messages
 * Voice Engine v1.0 - 发送聊天消息（含语音状态机）
 */
export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;
    const body = await request.json();
    const { content, image_url, audio_url, audio_duration, audio_size, audio_format, voice_status } = body;

    if (!content && !image_url && !audio_url) {
      return NextResponse.json(
        { error: getMessage('SEND_FAILED', request) },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status, scheduled_at, duration_minutes')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: getMessage('BOOKING_NOT_FOUND', request) }, { status: 404 });
    }

    const masterInfo = getMasterByEmail(user.email || '');
    const isUser = booking.user_id === user.id;
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;

    if (!isUser && !isMaster) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_USER', request) }, { status: 403 });
    }

    if (isUser) {
      if (!['confirmed', 'in_progress'].includes(booking.status)) {
        return NextResponse.json(
          { error: getMessage('CONSULTATION_ENDED', request), currentStatus: booking.status },
          { status: 400 }
        );
      }
      if (booking.scheduled_at && booking.duration_minutes) {
        const endTime = new Date(booking.scheduled_at).getTime() + booking.duration_minutes * 60 * 1000;
        if (Date.now() > endTime) {
          return NextResponse.json({ error: getMessage('CONSULTATION_ENDED', request) }, { status: 400 });
        }
      }
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: getMessage('UNPAID_BOOKING', request) }, { status: 400 });
    }

    const senderName = isMaster
      ? masterInfo?.name || 'Master'
      : user.user_metadata?.full_name || user.email || 'User';

    const insertPayload: any = {
      booking_id: bookingId,
      sender_id: user.id,
      sender_type: isMaster ? 'master' : 'user',
      sender_name: senderName,
      content: content || null,
      image_url: image_url || null,
      audio_url: audio_url || null,
      audio_duration: audio_duration != null ? audio_duration : null,
      audio_size: audio_size != null ? audio_size : null,
      audio_format: audio_format || null,
      voice_status: voice_status || (audio_url ? 'sent' : null),
      source: 'chat',
    };

    const { data: insertedRows, error: insertError } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select();

    if (insertError) {
      console.error('[chat:POST] Insert message error:', insertError);
      return NextResponse.json(
        { error: getMessage('SEND_FAILED', request), message: insertError.message },
        { status: 500 }
      );
    }

    const message = insertedRows && insertedRows.length > 0 ? insertedRows[0] : null;

    if (!message) {
      console.error('[chat:POST] Insert succeeded but no row returned');
      return NextResponse.json(
        { error: getMessage('SEND_FAILED', request), message: 'Insert succeeded but no row returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: { api: 'chat/messages', method: 'POST', component: 'chat' },
      extra: { bookingId: params?.bookingId },
    });
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}
