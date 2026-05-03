import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'
import {
  orderConfirmationEmail,
  newOrderNotificationEmail,
  sendEmail,
} from '@/lib/resend'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: Request) {
  try {
    const stripe = getStripe()
    const payload = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !webhookSecret) {
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

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(paymentIntent, supabase)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', message: error.message },
      { status: 500 }
    )
  }
}

// 处理 checkout.session.completed 事件
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const orderId = session.metadata?.order_id
  const userId = session.metadata?.user_id
  const masterId = session.metadata?.master_id
  const masterServiceId = session.metadata?.master_service_id
  const serviceType = session.metadata?.service_type

  if (!orderId) {
    console.error('No order_id in session metadata')
    return
  }

  const now = new Date().toISOString()

  try {
    // 1. 获取订单信息
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        user_id, master_id, type, service_name,
        user:profiles(email, full_name),
        master:masters(display_name, email)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', orderId, orderError)
      return
    }

    // 2. 更新订单状态为 paid
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: now,
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Error updating order:', updateError)
      throw updateError
    }

    // 3. 创建支付记录
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        amount: (session.amount_total || 0) / 100,
        currency: session.currency?.toUpperCase() || 'HKD',
        status: 'completed',
        payment_method: session.payment_method_types?.[0] || 'card',
        metadata: {
          master_id: masterId,
          master_service_id: masterServiceId,
          service_type: serviceType,
          customer_email: session.customer_email,
        },
        created_at: now,
        updated_at: now,
      })

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
    }

    // 4. 发送确认邮件给用户（异步）
    const userEmail = order.user?.email || session.customer_email
    const userName = order.user?.full_name
    const serviceName = order.service_name
    const masterName = order.master?.display_name || 'Master'
    const amount = (session.amount_total || 0) / 100
    const currency = session.currency?.toUpperCase() || 'HKD'

    if (userEmail) {
      sendEmail(
        userEmail,
        orderConfirmationEmail(userName, orderId, serviceName, masterName, amount, currency)
      ).catch(err => console.error('Failed to send confirmation email:', err))
    }

    // 5. 通知师傅有新订单（异步）
    const masterEmail = order.master?.email
    if (masterEmail) {
      sendEmail(
        masterEmail,
        newOrderNotificationEmail(masterName, orderId, serviceName, serviceType || 'message')
      ).catch(err => console.error('Failed to send master notification:', err))
    }

    console.log(`✅ Order ${orderId} paid successfully`)
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error)
    throw error
  }
}

// 处理 checkout.session.expired 事件
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
    console.error('Error updating expired order:', error)
  } else {
    console.log(`⏰ Order ${orderId} marked as cancelled (expired)`)
  }
}

// 处理 payment_intent.payment_failed 事件
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (error || !order) {
    console.error('Order not found for failed payment:', paymentIntent.id)
    return
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('Error updating failed payment order:', updateError)
  } else {
    console.log(`❌ Payment failed for order ${order.id}`)
  }
}
