import { NextResponse } from 'next/server'
import { getStripe, convertToStripeAmount } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

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
    
    // 创建或获取 Stripe Customer
    let customerId: string
    const supabase = createServiceClient()
    
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
