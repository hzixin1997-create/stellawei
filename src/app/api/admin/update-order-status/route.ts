import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, action } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }
    if (!action || !['cancel', 'refund'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "cancel" or "refund"' }, { status: 400 });
    }

    if (body.status !== undefined) {
      return NextResponse.json({ error: 'Direct status modification is not allowed. Use action instead.' }, { status: 400 });
    }

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 查询当前订单状态
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status, payment_status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

    if (action === 'cancel') {
      // 取消订单：只允许 pending/confirmed/in_progress
      if (!['pending', 'confirmed', 'in_progress'].includes(booking.status)) {
        return NextResponse.json(
          { error: 'Cannot cancel booking with status: ' + booking.status },
          { status: 400 }
        );
      }
      updateData.status = 'cancelled';
      updateData.payment_status = 'cancelled';
    }

    if (action === 'refund') {
      // 退款：只允许已支付的订单
      if (booking.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Cannot refund unpaid booking', payment_status: booking.payment_status },
          { status: 400 }
        );
      }
      updateData.payment_status = 'refunded';
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking: data });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}