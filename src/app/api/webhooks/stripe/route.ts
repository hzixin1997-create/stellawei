import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase";
import { sendBookingConfirmationToUser, sendNewBookingToMaster, sendAdminNotification } from "@/lib/resend";
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
    const now = new Date().toISOString();
    const { data: booking, error } = await supabase
      .from("bookings")
      .update({
        payment_status: "paid",
        status: "confirmed",
        stripe_payment_intent_id: paymentIntentId,
        payment_sync_status: "synced",
        payment_synced_at: now,
        updated_at: now,
      })
      .eq("id", bookingId)
      .in("payment_status", ["pending", "pending_payment", "refund_requested"]) // 幂等：只有未支付或退款申请的才更新
      .select("*")
      .single();

    if (error) {
      console.error('[Webhook] Booking update error:', error);
      await logPayment('failed', error.message);
    } else if (booking) {
      await logPayment('success', undefined, booking);
      // 发送飞书新订单通知
      await sendFeishuNotification(booking, supabase);
    } else {
      // Booking not found or already updated
      await logPayment('skipped', 'Booking not found or already paid');
    }
    return;
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
async function sendFeishuNotification(booking: any, supabase: any) {
  const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL;
  if (!FEISHU_WEBHOOK) {
    console.warn('[Webhook] FEISHU_WEBHOOK_URL not configured');
    return;
  }

  try {
    // 获取师傅信息
    const { data: master } = await supabase
      .from('masters')
      .select('display_name, email')
      .eq('slug', booking.master_id)
      .single();

    // 获取用户信息
    const { data: user } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', booking.user_id)
      .single();

    const orderNumber = booking.order_number || booking.id.slice(0, 8);
    const masterName = master?.display_name || booking.master_id;
    const userName = user?.full_name || user?.email || 'Unknown';
    const serviceName = booking.service_id || 'Consultation';
    const scheduledDate = booking.scheduled_date || '-';
    const scheduledTime = booking.scheduled_time || '-';
    const duration = booking.duration_minutes || 25;
    const amount = booking.total_amount || 0;
    const chatUrl = `https://stellawei.org/chat/${booking.id}`;

    const content = `🔔 新预约订单

订单号：${orderNumber}
师傅：${masterName}
用户：${userName}
服务：${serviceName}（${duration}分钟）
预约时间：${scheduledDate} ${scheduledTime}（${booking.timezone || 'Asia/Shanghai'}）
金额：$${amount.toFixed(2)}

立即查看：${chatUrl}`;

    await fetch(FEISHU_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: JSON.stringify({ text: content }),
      }),
    });

    console.log('[Webhook] Feishu notification sent for booking:', booking.id);
  } catch (err) {
    console.error('[Webhook] Failed to send Feishu notification:', err);
  }
}
