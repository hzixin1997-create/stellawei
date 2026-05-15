import { NextResponse } from 'next/server'
import { getStripe, convertToStripeAmount } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

const PAYMENT_TIMEOUT_MINUTES = 10

export async function POST(request: Request) {
  try {
    const stripe = getStripe()
    const body = await request.json()
    const { 
      bookingId, 
      masterId, 
      serviceId, 
      amount, 
      currency = 'usd',
      userId,
      userEmail,
      userName,
      masterName,
      serviceName,
      scheduledDate,
      scheduledTime,
      isFirstTime = false
    } = body

    // 验证必需参数
    if (!bookingId || !amount || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: bookingId, amount, userId' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const supabase = createServiceClient()

    // ─── 检查订单是否已过期 ───
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('expires_at, payment_status')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // 如果已经过期
    if (booking.expires_at && new Date(booking.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Booking has expired. Please book again.' },
        { status: 410 }
      )
    }

    // 如果已经支付过了
    if (booking.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Booking already paid' },
        { status: 409 }
      )
    }

    // 计算 Stripe 过期时间（Unix 时间戳，秒）
    const stripeExpiresAt = Math.floor(Date.now() / 1000) + PAYMENT_TIMEOUT_MINUTES * 60

    // 更新 booking 的 expires_at（如果不存在的话）
    const bookingExpiresAt = booking.expires_at
      ? new Date(booking.expires_at).toISOString()
      : new Date(Date.now() + PAYMENT_TIMEOUT_MINUTES * 60 * 1000).toISOString()

    if (!booking.expires_at) {
      await supabase
        .from('bookings')
        .update({ expires_at: bookingExpiresAt })
        .eq('id', bookingId)
    }
    
    // 创建或获取 Stripe Customer
    let customerId: string
    
    // 查询用户是否已有 stripe_customer_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (userError || !userData?.stripe_customer_id) {
      // 创建新的 Stripe Customer
      const customer = await stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          user_id: userId,
        },
      })
      customerId = customer.id

      // 更新用户记录
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)
    } else {
      customerId = userData.stripe_customer_id
    }

    // 构建服务描述
    const serviceDescription = serviceName 
      ? `${serviceName} with ${masterName || 'Master'}`
      : 'Consultation Service'

    // 构建预约时间描述
    const bookingTimeDescription = scheduledDate && scheduledTime
      ? `Scheduled for ${scheduledDate} at ${scheduledTime}`
      : ''

    // 转换金额为 Stripe 格式（美分）
    const stripeAmount = convertToStripeAmount(amount, currency)

    // 创建 Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: serviceDescription,
              description: bookingTimeDescription,
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      expires_at: stripeExpiresAt,
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment/cancel?booking_id=${bookingId}`,
      metadata: {
        booking_id: bookingId,
        user_id: userId,
        master_id: masterId || '',
        service_id: serviceId || '',
        is_first_time: String(isFirstTime),
        original_amount: String(amount),
      },
      customer_email: userEmail || undefined,
    })

    // 更新 booking 记录，保存 session ID
    await supabase
      .from('bookings')
      .update({
        payment_intent_id: session.id,
        payment_status: 'pending',
        expires_at: bookingExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session', message: error.message },
      { status: 500 }
    )
  }
}
