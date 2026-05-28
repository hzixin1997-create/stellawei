import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sync-payment
 * 对指定 booking 查询 Stripe 支付状态，如已支付则同步到数据库
 * Body: { bookingId: string }
 */
export async function POST(request: Request) {
  try {
    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId } = body;
    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. 确认 booking 属于当前用户且为 pending 状态
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, payment_status, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (booking.payment_status !== 'pending' && booking.payment_status !== 'pending_payment') {
      return NextResponse.json({
        success: true,
        synced: false,
        reason: 'Booking is not in pending state',
        payment_status: booking.payment_status,
      });
    }

    // 2. 查询 Stripe 该 booking 对应的 checkout session
    const stripe = getStripe();
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
      // Stripe API 支持按 metadata 过滤
      // @ts-ignore - stripe types may not include this
      metadata: { booking_id: bookingId },
    });

    // 3. 查找已支付的 session
    const paidSession = sessions.data.find(
      (s) => s.payment_status === 'paid' && s.status === 'complete'
    );

    if (!paidSession) {
      return NextResponse.json({
        success: true,
        synced: false,
        reason: 'No paid Stripe session found for this booking',
      });
    }

    // 4. 更新 booking 为已支付
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        stripe_payment_intent_id: paidSession.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('[sync-payment] update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      synced: true,
      payment_status: 'paid',
      booking: updated,
    });
  } catch (error: any) {
    console.error('[sync-payment] error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
