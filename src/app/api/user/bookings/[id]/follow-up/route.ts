import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_FOLLOW_UPS = 3;

/**
 * POST /api/user/bookings/[id]/follow-up
 * 用户在留言咨询中补充信息（追问）
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: bookingId } = params;
    const body = await request.json();
    const { content, image_url } = body;

    if (!content?.trim() && !image_url) {
      return NextResponse.json({ error: 'Content or image_url is required' }, { status: 400 });
    }

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 1. 验证订单存在且属于当前用户
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, consultation_type, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (booking.payment_status !== 'paid' && booking.payment_status !== 'confirmed' && booking.payment_status !== 'completed') {
      return NextResponse.json({ error: 'Booking not paid' }, { status: 400 });
    }

    // 2. 统计用户已发送的 follow_up 消息数
    const { data: userFollowUps, error: countError } = await supabase
      .from('messages')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('sender_type', 'user')
      .eq('source', 'follow_up');

    if (countError) {
      console.error('Count follow-ups error:', countError);
      return NextResponse.json({ error: 'Failed to count follow-ups' }, { status: 500 });
    }

    const usedCount = userFollowUps?.length || 0;
    if (usedCount >= MAX_FOLLOW_UPS) {
      return NextResponse.json({ error: 'Follow-up limit reached', code: 'LIMIT_REACHED', used: usedCount, max: MAX_FOLLOW_UPS }, { status: 400 });
    }

    // 3. 插入 follow_up 消息
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        sender_type: 'user',
        sender_name: user.user_metadata?.full_name || user.email || 'User',
        content: content?.trim() || null,
        image_url: image_url || null,
        source: 'follow_up',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !message) {
      console.error('Insert follow-up error:', insertError);
      return NextResponse.json({ error: 'Failed to send follow-up' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message,
      remaining: MAX_FOLLOW_UPS - usedCount - 1,
    });
  } catch (error: any) {
    console.error('User follow-up API error:', error);
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

/**
 * GET /api/user/bookings/[id]/follow-up
 * 获取当前用户的 follow-up 次数信息
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: bookingId } = params;

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证订单属于当前用户
    const { data: booking } = await supabase
      .from('bookings')
      .select('user_id')
      .eq('id', bookingId)
      .single();

    if (!booking || booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 统计双方 follow_up 次数
    const { data: allFollowUps } = await supabase
      .from('messages')
      .select('sender_type')
      .eq('booking_id', bookingId)
      .eq('source', 'follow_up');

    const userCount = allFollowUps?.filter((m: any) => m.sender_type === 'user').length || 0;
    const masterCount = allFollowUps?.filter((m: any) => m.sender_type === 'master').length || 0;

    return NextResponse.json({
      userRemaining: Math.max(0, MAX_FOLLOW_UPS - userCount),
      masterRemaining: Math.max(0, MAX_FOLLOW_UPS - masterCount),
      userUsed: userCount,
      masterUsed: masterCount,
    });
  } catch (error: any) {
    console.error('Follow-up count API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
