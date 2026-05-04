import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'
import { sendEmail, orderConfirmationEmail, newOrderNotificationEmail } from '@/lib/resend'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

/**
 * POST /api/webhook
 * 一期 Stripe Webhook 回调（支付完成/过期）
 */
export async function POST(request: Request) {
  try {
    const stripe = getStripe()
    const payload = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !webhookSecret) {
      console.error('Missing stripe-signature or STRIPE_WEBHOOK_SECRET')
      return NextResponse.json(
        { error: 'Missing stripe signature or webhook secret' },
        { status: 400 }
      )
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionCompleted(session, supabase)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutSessionExpired(session, supabase)
        break
      }

      default:
        console.log(`[P1 Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[P1 Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const orderId = session.metadata?.order_id
  const isP1 = session.metadata?.is_p1 === 'true'
  const userEmail = session.metadata?.user_email || session.customer_email
  const masterId = session.metadata?.master_id

  if (!orderId) {
    console.error('[P1 Webhook] No order_id in session metadata')
    return
  }

  const now = new Date().toISOString()

  try {
    // 1. 获取订单信息
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, status, service_type, service_name, amount, currency, master_slug, user_email')
      .eq('id', orderId)
      .single()

    if (orderFetchError || !order) {
      console.error('[P1 Webhook] Order not found:', orderId, orderFetchError)
      return
    }

    if (order.status === 'paid') {
      console.log(`[P1 Webhook] Order ${orderId} already paid, skipping`)
      return
    }

    // 2. 更新订单状态
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: now,
        updated_at: now,
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('[P1 Webhook] Error updating order:', updateError)
      throw updateError
    }

    // 3. 如果是 P1 留言订单，创建初始 messages 记录
    if (isP1 && order.service_type === 'message') {
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          order_id: orderId,
          user_email: userEmail || order.user_email || '',
          content: '', // 等待用户提交问题
          status: 'pending',
          created_at: now,
          updated_at: now,
        })

      if (msgError) {
        console.error('[P1 Webhook] Error creating initial message record:', msgError)
      }
    }

    // 4. 发送确认邮件给用户（异步，不阻塞）
    if (userEmail) {
      sendEmail(
        userEmail,
        orderConfirmationEmail(
          '',
          orderId,
          order.service_name || 'Consultation',
          order.master_slug || 'Master',
          order.amount || 0,
          order.currency || 'USD'
        )
      ).catch(err => console.error('[P1 Webhook] Failed to send user confirmation:', err))
    }

    // 5. 通知师傅有新订单（异步）
    const masterEmail = getMasterEmail(masterId || order.master_slug)
    if (masterEmail) {
      sendEmail(
        masterEmail,
        newOrderNotificationEmail(
          order.master_slug || 'Master',
          orderId,
          order.service_name || 'Consultation',
          order.service_type || 'message'
        )
      ).catch(err => console.error('[P1 Webhook] Failed to send master notification:', err))
    }

    console.log(`[P1 Webhook] ✅ Order ${orderId} marked as paid`)
  } catch (error) {
    console.error('[P1 Webhook] Error handling checkout.session.completed:', error)
    throw error
  }
}

async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const orderId = session.metadata?.order_id
  if (!orderId) return

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    console.error('[P1 Webhook] Error updating expired order:', error)
  } else {
    console.log(`[P1 Webhook] ⏰ Order ${orderId} marked as cancelled (expired)`)
  }
}

function getMasterEmail(slug: string | null): string | null {
  const emails: Record<string, string> = {
    'zhang-yihua': 'qimenyihua@gmail.com',
    'wu-yang': 'mshoucangjia@gmail.com',
  }
  return slug ? emails[slug] || null : null
}
