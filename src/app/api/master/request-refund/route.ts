import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/master/request-refund
 * 师傅申请退款（没来得及接/忘记接）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, reason } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookingId' },
        { status: 400 }
      );
    }

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 验证师傅身份
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: 'Not a master' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 验证 booking 存在且属于当前师傅
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, master_id, status, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.master_id !== masterInfo.slug) {
      return NextResponse.json(
        { error: 'This booking does not belong to you' },
        { status: 403 }
      );
    }

    // 检查是否允许退款
    if (booking.status === 'cancelled' || booking.status === 'refunded' || booking.status === 'refund_requested') {
      return NextResponse.json(
        { error: 'Booking is already cancelled, refunded, or refund requested' },
        { status: 400 }
      );
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Booking is not paid' },
        { status: 400 }
      );
    }

    // 更新订单状态为退款申请中，记录师傅退款原因
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'refund_requested',
        payment_status: 'refund_requested',
        refund_reason: reason || '师傅未及时接单，申请退款',
        refund_requested_by: 'master',
        refund_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('Master request refund error:', updateError);
      return NextResponse.json(
        { error: 'Failed to request refund', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Master request refund API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
