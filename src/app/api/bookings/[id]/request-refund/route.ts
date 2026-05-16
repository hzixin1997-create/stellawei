import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/[id]/request-refund
 * 用户申请退款
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证 booking 存在且属于当前用户
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, status, payment_status')
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 检查是否允许退款
    if (booking.status === 'cancelled' || booking.status === 'refunded') {
      return NextResponse.json({ error: 'Booking is already cancelled or refunded' }, { status: 400 });
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Booking is not paid' }, { status: 400 });
    }

    // 更新订单状态为退款申请中
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'refund_requested',
        payment_status: 'refund_requested',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Request refund error:', updateError);
      return NextResponse.json(
        { error: 'Failed to request refund', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Request refund API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
