import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'
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

    // 处理不同类型的事件
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

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await handleChargeRefunded(charge, supabase)
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
  const bookingId = session.metadata?.booking_id
  const userId = session.metadata?.user_id
  const masterId = session.metadata?.master_id
  const serviceId = session.metadata?.service_id

  if (!bookingId) {
    console.error('No booking_id in session metadata')
    return
  }

  const now = new Date().toISOString()

  try {
    // 1. 更新 bookings 表
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        payment_intent_id: session.payment_intent as string,
        paid_at: now,
        updated_at: now,
      })
      .eq('id', bookingId)

    if (bookingError) {
      console.error('Error updating booking:', bookingError)
      throw bookingError
    }

    // 2. 创建 payments 表记录
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent as string,
        amount: (session.amount_total || 0) / 100, // 转换为元
        currency: session.currency?.toUpperCase() || 'USD',
        status: 'completed',
        payment_method: session.payment_method_types?.[0] || 'card',
        metadata: {
          master_id: masterId,
          service_id: serviceId,
          customer_email: session.customer_email,
          customer_details: session.customer_details,
        },
        created_at: now,
        updated_at: now,
      })

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
      throw paymentError
    }

    // 3. 如果有首次用户标记，更新用户的 first_booking_completed
    const isFirstTime = session.metadata?.is_first_time === 'true'
    if (isFirstTime && userId) {
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_booking_completed: true,
          updated_at: now,
        })
        .eq('id', userId)

      if (userError) {
        console.error('Error updating user first booking status:', userError)
      }
    }

    console.log(`✅ Payment completed for booking ${bookingId}`)
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
  const bookingId = session.metadata?.booking_id
  
  if (!bookingId) return

  const { error } = await supabase
    .from('bookings')
    .update({
      payment_status: 'expired',
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (error) {
    console.error('Error updating expired booking:', error)
  } else {
    console.log(`⏰ Booking ${bookingId} marked as expired`)
  }
}

// 处理 payment_intent.payment_failed 事件
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  supabase: any
) {
  // 通过 payment intent 查找对应的 booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('payment_intent_id', paymentIntent.id)
    .single()

  if (error || !booking) {
    console.error('Booking not found for failed payment:', paymentIntent.id)
    return
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id)

  if (updateError) {
    console.error('Error updating failed payment booking:', updateError)
  } else {
    console.log(`❌ Payment failed for booking ${booking.id}`)
  }
}

// 处理 charge.refunded 事件
async function handleChargeRefunded(charge: Stripe.Charge, supabase: any) {
  const refundId = charge.refunds?.data[0]?.id
  
  // 查找对应的 booking
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('stripe_refund_id', refundId)
    .single()

  if (error || !booking) {
    // 尝试通过 payment_intent 查找
    const { data: booking2, error: error2 } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_intent_id', charge.payment_intent)
      .single()
    
    if (error2 || !booking2) {
      console.error('Booking not found for refund:', charge.id)
      return
    }

    // 更新 booking 状态
    await supabase
      .from('bookings')
      .update({
        payment_status: 'refunded',
        status: 'refunded',
        stripe_refund_id: refundId,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking2.id)

    // 更新 payment 记录
    await supabase
      .from('payments')
      .update({
        status: 'refunded',
        stripe_refund_id: refundId,
        refund_amount: (charge.amount_refunded || 0) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', charge.payment_intent)

    console.log(`💰 Refund processed for booking ${booking2.id}`)
    return
  }

  // 更新 booking 状态
  await supabase
    .from('bookings')
    .update({
      payment_status: 'refunded',
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id)
}
