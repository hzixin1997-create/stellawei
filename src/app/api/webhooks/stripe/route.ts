import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { handlePaymentSuccess } from "@/lib/payment-success";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

import * as Sentry from '@sentry/nextjs';

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature || !webhookSecret) {
      return NextResponse.json(
        { error: "Missing stripe-signature or webhook secret" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      Sentry.captureException(err, {
        tags: { api: 'webhooks/stripe', component: 'webhook', stage: 'signature-verification' },
      });
      // Webhook signature verification failed - logged in error tracking system
      return NextResponse.json(
        { error: `Webhook verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 幂等检查：同一 Stripe Event ID 只处理一次
    const { data: existingEvent } = await supabase
      .from('payment_logs')
      .select('id')
      .eq('stripe_session_id', event.id)
      .eq('event_type', event.type)
      .limit(1)
      .single();
    
    if (existingEvent) {
      console.log('[Webhook] Event already processed, skipping:', event.id, event.type);
      return NextResponse.json({ received: true, skipped: 'already_processed' });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session, supabase);
        break;
      }
      default:
        // Unhandled webhook event type
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: { api: 'webhooks/stripe', component: 'webhook', stage: 'webhook-processing' },
    });
    // Webhook processing error - logged in error tracking system
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const metadata = session.metadata || {};
  const consultationId = metadata.consultationId;
  const bookingId = metadata.booking_id;
  const paymentIntentId = session.payment_intent as string;

  // 记录支付日志
  const logPayment = async (status: string, errorMessage?: string, bookingRecord?: any) => {
    try {
      await supabase.from('payment_logs').insert({
        booking_id: bookingId,
        consultation_id: consultationId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        event_type: 'checkout.session.completed',
        status,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        error_message: errorMessage || null,
        metadata: {
          customer_email: session.customer_email,
          customer_details: session.customer_details,
        },
        booking_status_after: bookingRecord?.status || null,
        payment_status_after: bookingRecord?.payment_status || null,
      });
    } catch (logErr) {
      console.error('[Webhook] Failed to log payment:', logErr);
    }
  };

  // 1. 优先处理 bookings 表（实时咨询）
  if (bookingId) {
    try {
      const metadata = session.metadata || {};
      const amount = session.amount_total ? session.amount_total / 100 : 0;

      await handlePaymentSuccess({
        bookingId,
        userId: metadata.user_id || '',
        masterId: metadata.master_id || undefined,
        serviceId: metadata.service_id || undefined,
        amount,
        currency: session.currency || 'usd',
        paymentMethod: 'stripe',
        stripeSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      });

      return;
    } catch (err: any) {
      console.error('[Webhook] Payment success handler failed:', err);
      // 尝试记录失败日志
      try {
        await supabase.from('payment_logs').insert({
          booking_id: bookingId,
          stripe_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          event_type: 'checkout.session.completed',
          status: 'failed',
          amount: session.amount_total ? session.amount_total / 100 : 0,
          currency: session.currency,
          error_message: err.message,
        });
      } catch (logErr) {
        console.error('[Webhook] Failed to log payment:', logErr);
      }
      return;
    }
  }

  // 2. 处理 consultations 表（留言咨询）
  if (!consultationId) {
    // Invalid session metadata - no consultationId or booking_id
    return;
  }

  const { data: consultation, error } = await supabase
    .from("consultations")
    .update({
      status: "paid",
      stripe_payment_intent_id: session.payment_intent as string,
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultationId)
    .eq("status", "pending") // 幂等：只有 pending 才更新
    .select("*, profiles(*), masters(*, profiles(*))")
    .single();

  if (error || !consultation) {
    // Webhook update consultation failed - logged in error tracking system
    return;
  }

  // 发送邮件（异步，不阻塞）
  try {
    await sendBookingConfirmationToUser({
      userEmail: consultation.profiles.email,
      userName: consultation.profiles.full_name || "Client",
      masterName: consultation.masters.name,
      serviceType: consultation.service_type,
      scheduledAt: consultation.scheduled_at,
      price: consultation.price_usd / 100,
    });

    if (consultation.masters.profiles?.email) {
      await sendNewBookingToMaster({
        masterEmail: consultation.masters.profiles.email,
        masterName: consultation.masters.name,
        userName: consultation.profiles.full_name || "Client",
        serviceType: consultation.service_type,
        scheduledAt: consultation.scheduled_at,
        price: consultation.price_usd / 100,
      });
    }

    await sendAdminNotification({
      consultationId: consultation.id,
      userEmail: consultation.profiles.email,
      masterName: consultation.masters.name,
      serviceType: consultation.service_type,
      price: consultation.price_usd / 100,
    });
  } catch (emailErr) {
    // Email notification error - logged in error tracking system
  }

      // Webhook: Consultation marked as paid
}

async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const metadata = session.metadata || {};
  const consultationId = metadata.consultationId;
  const bookingId = metadata.booking_id;

  const logPayment = async (status: string, errorMessage?: string) => {
    try {
      await supabase.from('payment_logs').insert({
        booking_id: bookingId,
        consultation_id: consultationId,
        stripe_session_id: session.id,
        event_type: 'checkout.session.expired',
        status,
        amount: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        error_message: errorMessage || null,
        metadata: { expires_at: session.expires_at },
      });
    } catch (logErr) {
      console.error('[Webhook] Failed to log expired payment:', logErr);
    }
  };

  // 处理 bookings 表（幂等：只更新 pending 状态的订单）
  if (bookingId) {
    const { data: existing } = await supabase
      .from("bookings")
      .select("payment_status")
      .eq("id", bookingId)
      .single();
    
    // 如果订单已经 paid，不要覆盖为 failed
    if (existing?.payment_status === 'paid') {
      await logPayment('skipped', 'Booking already paid, ignoring expired event');
      return;
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        payment_status: "failed",
        status: "cancelled",
        payment_sync_status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("payment_status", "pending"); // 幂等：只更新 pending

    if (error) {
      console.error('[Webhook] Expired booking update error:', error);
      await logPayment('failed', error.message);
    } else {
      await logPayment('success');
    }
    return;
  }

  // 处理 consultations 表
  if (!consultationId) return;

  const { error } = await supabase
    .from("consultations")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", consultationId);

  if (error) {
    // Webhook expired update failed - logged in error tracking system
  } else {
    // Consultation cancelled (expired)
  }
}

// 发送飞书新订单通知

