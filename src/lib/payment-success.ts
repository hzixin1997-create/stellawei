import { createServiceClient } from '@/lib/supabase';
import { sendBookingConfirmationToUser, sendNewBookingToMaster, sendAdminNotification } from '@/lib/resend';

export interface PaymentSuccessContext {
  bookingId: string;
  userId: string;
  masterId?: string;
  serviceId?: string;
  amount: number;
  currency?: string;
  paymentMethod: 'stripe' | 'credit';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  creditUsed?: number;
}

/**
 * 统一支付成功处理逻辑
 * 被 Stripe Webhook 和 Credit 全额支付共用
 */
export async function handlePaymentSuccess(ctx: PaymentSuccessContext) {
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // ─── 1. 更新 booking 状态 ───
  const { data: booking, error: updateError } = await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      stripe_session_id: ctx.stripeSessionId || null,
      stripe_payment_intent_id: ctx.stripePaymentIntentId || null,
      payment_sync_status: 'synced',
      payment_synced_at: now,
      updated_at: now,
    })
    .eq('id', ctx.bookingId)
    .in('payment_status', ['pending', 'pending_payment', 'refund_requested'])
    .select('*')
    .single();

  if (updateError) {
    console.error('[payment-success] Booking update error:', updateError);
    throw new Error(`Failed to update booking: ${updateError.message}`);
  }

  if (!booking) {
    // 可能已经被其他流程更新过，幂等跳过
    console.log('[payment-success] Booking already paid or not found:', ctx.bookingId);
    return { alreadyProcessed: true };
  }

  // ─── 2. 记录 payment_logs ───
  try {
    await supabase.from('payment_logs').insert({
      booking_id: ctx.bookingId,
      stripe_session_id: ctx.stripeSessionId || `credit_${ctx.bookingId}`,
      stripe_payment_intent_id: ctx.stripePaymentIntentId || null,
      event_type: ctx.paymentMethod === 'stripe' ? 'checkout.session.completed' : 'credit.full_payment',
      status: 'success',
      amount: ctx.amount,
      currency: ctx.currency || 'usd',
      metadata: {
        payment_method: ctx.paymentMethod,
        credit_used: ctx.creditUsed || 0,
        customer_id: ctx.userId,
      },
      booking_status_after: booking.status,
      payment_status_after: booking.payment_status,
    });
  } catch (logErr) {
    console.error('[payment-success] Failed to log payment:', logErr);
    // 日志失败不影响主流程
  }

  // ─── 3. 获取师傅信息 ───
  let masterName = 'Unknown Master';
  let masterEmail = '';
  if (ctx.masterId || booking.master_id) {
    try {
      const { data: master } = await supabase
        .from('masters')
        .select('display_name, email')
        .eq('slug', ctx.masterId || booking.master_id)
        .single();
      if (master) {
        masterName = master.display_name || masterName;
        masterEmail = master.email || '';
      }
    } catch (err) {
      console.error('[payment-success] Failed to fetch master info:', err);
    }
  }

  // ─── 4. 获取用户信息 ───
  let userName = 'Client';
  let userEmail = '';
  try {
    const { data: user } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', ctx.userId)
      .single();
    if (user) {
      userName = user.full_name || user.email || userName;
      userEmail = user.email || '';
    }
  } catch (err) {
    console.error('[payment-success] Failed to fetch user info:', err);
  }

  // ─── 5. 发送飞书通知 ───
  try {
    await sendFeishuNotification(booking, supabase, ctx.paymentMethod);
  } catch (err) {
    console.error('[payment-success] Feishu notification failed:', err);
  }

  // ─── 6. 发送用户确认邮件 ───
  if (userEmail) {
    try {
      const serviceName = booking.service_id || 'Consultation';
      const scheduledAt = booking.scheduled_date
        ? `${booking.scheduled_date} ${booking.scheduled_time || ''}`
        : 'To be scheduled';

      await sendBookingConfirmationToUser({
        userEmail,
        userName,
        masterName,
        serviceType: serviceName,
        scheduledAt,
        price: ctx.amount,
      });
      console.log('[payment-success] User confirmation email sent to', userEmail);
    } catch (err) {
      console.error('[payment-success] User email failed:', err);
    }
  }

  // ─── 7. 发送师傅新订单邮件 ───
  if (masterEmail) {
    try {
      await sendNewBookingToMaster({
        masterEmail,
        masterName,
        userName,
        serviceType: booking.service_id || 'Consultation',
        scheduledAt: booking.scheduled_date
          ? `${booking.scheduled_date} ${booking.scheduled_time || ''}`
          : 'To be scheduled',
        price: ctx.amount,
      });
      console.log('[payment-success] Master notification email sent to', masterEmail);
    } catch (err) {
      console.error('[payment-success] Master email failed:', err);
    }
  }

  // ─── 8. 发送管理员通知 ───
  try {
    await sendAdminNotification({
      consultationId: ctx.bookingId,
      userEmail: userEmail || 'unknown',
      masterName,
      serviceType: booking.service_id || 'Consultation',
      price: ctx.amount,
    });
  } catch (err) {
    console.error('[payment-success] Admin notification failed:', err);
  }

  return { booking, masterName, userName };
}

/**
 * 发送飞书通知（从 webhooks/stripe 抽离复用）
 */
async function sendFeishuNotification(
  booking: any,
  supabase: any,
  paymentMethod: string
) {
  const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL;
  if (!FEISHU_WEBHOOK) {
    console.warn('[payment-success] FEISHU_WEBHOOK_URL not configured');
    return;
  }

  try {
    const { data: master } = await supabase
      .from('masters')
      .select('display_name, email')
      .eq('slug', booking.master_id)
      .single();

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

    const paymentLabel = paymentMethod === 'credit' ? '💳 Credit' : '💰 Stripe';

    const content = `🔔 新预约订单（${paymentLabel}）

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
        content: { text: content },
      }),
    });

    console.log('[payment-success] Feishu notification sent for booking:', booking.id);
  } catch (err) {
    console.error('[payment-success] Failed to send Feishu notification:', err);
    throw err;
  }
}
