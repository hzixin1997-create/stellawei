import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

const MAX_FOLLOW_UPS = 3;

/**
 * POST /api/master/bookings/[id]/follow-up-reply
 * 师傅回复用户的留言咨询追问
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: bookingId } = params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: 'Not a master' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 1. 验证订单存在且属于当前师傅
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, master_id, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.master_id !== masterInfo.slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. 统计师傅已回复的 follow_up 消息数
    const { data: masterFollowUps, error: countError } = await supabase
      .from('messages')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('sender_type', 'master')
      .eq('source', 'follow_up');

    if (countError) {
      console.error('Count master follow-ups error:', countError);
      return NextResponse.json({ error: 'Failed to count replies' }, { status: 500 });
    }

    const usedCount = masterFollowUps?.length || 0;
    if (usedCount >= MAX_FOLLOW_UPS) {
      return NextResponse.json({ error: 'Reply limit reached', code: 'LIMIT_REACHED', used: usedCount, max: MAX_FOLLOW_UPS }, { status: 400 });
    }

    // 3. 插入回复消息
    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        sender_type: 'master',
        sender_name: masterInfo.name || 'Master',
        content: content.trim(),
        source: 'follow_up',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError || !message) {
      console.error('Insert follow-up reply error:', insertError);
      return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message,
      remaining: MAX_FOLLOW_UPS - usedCount - 1,
    });
  } catch (error: any) {
    console.error('Master follow-up reply API error:', error);
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

/**
 * GET /api/master/bookings/[id]/follow-up-reply
 * 获取师傅的 follow-up 回复次数信息
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

    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: 'Not a master' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 验证订单属于当前师傅
    const { data: booking } = await supabase
      .from('bookings')
      .select('master_id')
      .eq('id', bookingId)
      .single();

    if (!booking || booking.master_id !== masterInfo.slug) {
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
    console.error('Master follow-up count API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
