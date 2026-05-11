import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getStripe, convertToStripeAmount } from '@/lib/stripe'
import { generateOrderNumber } from '@/lib/utils'

// 一期定价（USD）
const PRICING: Record<string, Record<string, { amount: number; currency: string }>> = {
  'zhang-yihua': {
    'message': { amount: 29.9, currency: 'USD' },
    'realtime': { amount: 59.9, currency: 'USD' },
  },
  'wu-yang': {
    'message': { amount: 29.9, currency: 'USD' },
    'realtime': { amount: 59.9, currency: 'USD' },
  },
}

const MASTER_SLUGS: Record<string, string> = {
  'zhang-yihua': '张易桦师傅',
  'wu-yang': '戊阳师傅',
}

const SERVICE_LABELS: Record<string, string> = {
  'message': '留言咨询',
  'realtime': '实时咨询',
}

/**
 * POST /api/create-order
 * 一期简化订单创建（无需用户登录）
 *
 * Body: { master_id: 'zhang-yihua' | 'wu-yang', consultation_type: 'message' | 'realtime', user_email: string, user_question?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { master_id, consultation_type, user_email, user_question } = body

    // === 参数校验 ===
    if (!master_id || !consultation_type || !user_email) {
      return NextResponse.json(
        { error: 'Missing required fields: master_id, consultation_type, user_email' },
        { status: 400 }
      )
    }

    if (!PRICING[master_id]) {
      return NextResponse.json({ error: 'Invalid master_id' }, { status: 400 })
    }
    if (!PRICING[master_id][consultation_type]) {
      return NextResponse.json({ error: 'Invalid consultation_type' }, { status: 400 })
    }

    // 留言咨询必须有问题内容
    if (consultation_type === 'message' && (!user_question || user_question.trim().length < 10)) {
      return NextResponse.json(
        { error: 'Message consultation requires a question (min 10 characters)' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(user_email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const { amount, currency } = PRICING[master_id][consultation_type]
    const masterName = MASTER_SLUGS[master_id]
    const serviceLabel = SERVICE_LABELS[consultation_type]
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // === 查询数据库填充必填字段 ===
    // 1. 获取师傅 UUID
    const { data: master, error: masterErr } = await supabase
      .from('masters')
      .select('id, display_name, email')
      .or(`display_name.ilike.%${masterName.replace('师傅', '')}%,display_name.ilike.%${masterName}%`)
      .limit(1)
      .single()

    if (masterErr || !master) {
      console.error('Master lookup failed:', masterErr)
      return NextResponse.json(
        { error: 'Master not found in database' },
        { status: 500 }
      )
    }

    // 2. 获取一个 service 占位（用于满足外键约束）
    const { data: service } = await supabase
      .from('services')
      .select('id')
      .limit(1)
      .single()

    // 3. 获取或创建匿名用户占位
    const { data: anonProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'anonymous@stellawei.com')
      .single()

    let anonUserId = anonProfile?.id
    if (!anonUserId) {
      // 尝试用 service role 创建一个匿名 profile（如果 auth.users 中不存在则失败， graceful）
      const { data: newAnon } = await supabase
        .from('profiles')
        .insert({
          id: '00000000-0000-0000-0000-000000000001',
          email: 'anonymous@stellawei.com',
          full_name: 'Anonymous User',
          timezone: 'Asia/Shanghai',
          locale: 'en',
        })
        .select('id')
        .single()
      anonUserId = newAnon?.id
    }

    if (!anonUserId) {
      return NextResponse.json(
        { error: 'Cannot create order: anonymous user placeholder not available' },
        { status: 500 }
      )
    }

    // === 创建订单 ===
    const orderNumber = generateOrderNumber()

    const orderInsert: Record<string, any> = {
      order_number: orderNumber,
      user_id: anonUserId,
      master_id: master.id,
      master_slug: master_id,
      service_id: service?.id || '00000000-0000-0000-0000-000000000000',
      type: consultation_type === 'message' ? 'message' : 'booking',
      consultation_type: consultation_type,
      service_name: `${masterName} — ${serviceLabel}`,
      status: 'pending',
      user_email: user_email,
      amount: amount,
      subtotal: amount,
      total_amount: amount,
      currency: currency,
      scheduled_at: now,
      timezone: 'Asia/Shanghai',
      user_question: consultation_type === 'message' ? user_question : null,
      duration_minutes: consultation_type === 'message' ? 0 : 30,
      response_deadline: consultation_type === 'message'
        ? new Date(Date.now() + 48 * 3600000).toISOString()
        : null,
      created_at: now,
      updated_at: now,
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsert)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError.message },
        { status: 500 }
      )
    }

    // === 创建 Stripe Checkout Session ===
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chuhai-eight.vercel.app'
    const stripeAmount = convertToStripeAmount(amount, currency)

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Stellawei — ${serviceLabel}`,
              description: `${masterName} — ${serviceLabel} Consultation`,
            },
            unit_amount: stripeAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${appUrl}/payment/cancel?order_id=${order.id}`,
      metadata: {
        order_id: order.id,
        master_id: master_id,
        service_type: consultation_type,
        user_email: user_email,
        is_p1: 'true',
      },
      customer_email: user_email,
    })

    // 保存 stripe_session_id
    await supabase
      .from('orders')
      .update({
        stripe_session_id: session.id,
        updated_at: now,
      })
      .eq('id', order.id)

    return NextResponse.json({
      success: true,
      order_id: order.id,
      checkout_url: session.url,
    })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order', message: error.message },
      { status: 500 }
    )
  }
}
