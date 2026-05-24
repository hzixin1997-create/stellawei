import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/master/cancel-booking
 * 师傅取消订单并留言给用户（申请退款）
 * Body: { bookingId: string, reason: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, reason } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证师傅身份
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: 'Not a master account' }, { status: 403 });
    }

    // 获取 booking 详情
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, master_id, status, payment_status, user_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.master_id !== masterInfo.slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 只能取消已付款的订单
    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Can only cancel paid bookings' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // 更新订单状态为退款申请
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'refund_requested',
        payment_status: 'refund_requested',
        cancel_reason: reason || null,
        cancelled_at: now,
        updated_at: now,
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('Cancel booking error:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel booking', message: updateError.message },
        { status: 500 }
      );
    }

    // 发送消息给用户（如果提供了原因）
    if (reason) {
      const { data: masterData } = await supabase
        .from('masters')
        .select('display_name')
        .eq('id', masterInfo.slug)
        .single();

      const masterName = masterData?.display_name || masterInfo.name || '师傅';

      await supabase.from('messages').insert({
        booking_id: bookingId,
        sender_id: user.id,
        sender_type: 'master',
        sender_name: masterName,
        content: `[系统通知] 师傅因故取消了本次咨询，已申请退款。原因：${reason}`,
        source: 'system',
        created_at: now,
      });
    }

    return NextResponse.json({
      success: true,
      booking: updated,
      message: 'Booking cancelled and refund requested',
    });
  } catch (error: any) {
    console.error('Cancel booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
