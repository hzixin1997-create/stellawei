import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/messages
 * 获取当前用户收到的师傅消息（按 booking 分组）
 */
export async function GET(request: Request) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 1. 获取用户的所有 bookings（留言咨询 + 实时咨询）
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, master_id, service_id, consultation_type, status, payment_status, order_number, created_at')
      .eq('user_id', user.id)
      .in('payment_status', ['paid', 'confirmed'])
      .order('created_at', { ascending: false });

    if (bookingsError) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    const bookingIds = (bookings || []).map((b: any) => b.id);
    if (bookingIds.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // 2. 只获取师傅主动跟进的消息（follow_up），不查订单回复（order_reply）
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .in('booking_id', bookingIds)
      .eq('sender_type', 'master')
      .eq('source', 'follow_up')
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Messages fetch error:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // 3. 按 booking 分组
    const messagesByBooking: Record<string, any[]> = {};
    (messages || []).forEach((msg: any) => {
      if (!messagesByBooking[msg.booking_id]) {
        messagesByBooking[msg.booking_id] = [];
      }
      messagesByBooking[msg.booking_id].push(msg);
    });

    // 4. 组装结果（所有师傅发过 follow_up 消息的 booking）
    const bookingIdsWithMessages = Object.keys(messagesByBooking);
    const result = (bookings || [])
      .filter((b: any) => bookingIdsWithMessages.includes(b.id))
      .map((booking: any) => ({
        booking,
        messages: messagesByBooking[booking.id] || [],
        hasNewMessage: (messagesByBooking[booking.id] || []).length > 0,
      }));

    return NextResponse.json({ messages: result });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
