import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/messages
 * 获取当前用户收到的所有师傅消息（跨所有 booking）
 */
export async function GET(request: Request) {
  try {
    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 1. 获取用户的所有 bookings id
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, master_id, service_id, scheduled_date, scheduled_time, status, payment_status, total_amount, duration_minutes, is_first_time')
      .eq('user_id', user.id)
      .in('payment_status', ['paid', 'confirmed', 'completed'])
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('User messages fetch bookings error:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    const bookingIds = (bookings || []).map((b: any) => b.id);
    if (bookingIds.length === 0) {
      return NextResponse.json({ messages: [], bookings: [] });
    }

    // 2. 获取师傅发的所有消息
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .in('booking_id', bookingIds)
      .eq('sender_type', 'master')
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('User messages fetch error:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({
      messages: messages || [],
      bookings: bookings || [],
    });
  } catch (error: any) {
    console.error('User messages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
