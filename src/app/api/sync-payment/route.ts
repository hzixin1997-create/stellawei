import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sync-payment
 * 对指定 booking 查询 Stripe 支付状态，如已支付则同步到数据库
 * 使用 stripe_session_id 直接 retrieve，不再用 list + metadata 过滤
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
    const stripe = getStripe();
    const now = new Date().toISOString();

    // 1. 确认 booking 属于当前用户
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, payment_status, status, stripe_session_id, stripe_payment_intent_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. 如果已经 paid，无需重复检查
    if (booking.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        synced: false,
        reason: 'Already paid',
        payment_status: 'paid',
      });
    }

    // 3. 没有 stripe_session_id，无法查询
    if (!booking.stripe_session_id) {
      return NextResponse.json({
        success: true,
        synced: false,
        reason: 'No stripe_session_id found',
      });
    }

    // 4. 更新 last_payment_check_at
    await supabase
      .from('bookings')
      .update({ last_payment_check_at: now })
      .eq('id', bookingId);

    // 5. 用 retrieve 直接查询 Stripe session（比 list 更可靠）
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);
    } catch (retrieveErr: any) {
      console.error('[sync-payment] Stripe retrieve error:', retrieveErr);
      await supabase
        .from('bookings')
        .update({ payment_sync_status: 'failed' })
        .eq('id', bookingId);
      return NextResponse.json({
        success: false,
        synced: false,
        reason: 'Stripe retrieve failed',
        error: retrieveErr.message,
      });
    }

    // 6. 未支付
    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: true,
        synced: false,
        reason: 'Payment not completed',
        stripe_status: session.payment_status,
        status: session.status,
      });
    }

    // 7. 已支付！更新 booking
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        stripe_payment_intent_id: session.payment_intent as string,
        payment_sync_status: 'synced',
        payment_synced_at: now,
        updated_at: now,
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

    // 8. 记录支付日志
    try {
      await supabase.from('payment_logs').insert({
        booking_id: bookingId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        event_type: 'sync_payment',
        status: 'success',
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        booking_status_after: 'confirmed',
        payment_status_after: 'paid',
      });
    } catch (logErr) {
      console.error('[sync-payment] log error:', logErr);
    }

    return NextResponse.json({
      success: true,
      synced: true,
      payment_status: 'paid',
      booking: updated,
    });
  } catch (error: any) {
    console.error('[sync-payment] error:', error);
    Sentry.captureException(error, {
      tags: { api: 'sync-payment', component: 'payment' },
    });
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
