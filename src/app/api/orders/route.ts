import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getStripe, convertToStripeAmount } from '@/lib/stripe'

/**
 * POST /api/orders
 * 创建订单（支付前预创建）
 * 
 * Body:
 * {
 *   master_id: string,
 *   master_service_id: string,
 *   type: 'booking' | 'message'
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { master_id, master_service_id, type = 'message' } = body

    // 验证参数
    if (!master_id || !master_service_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: master_id, master_service_id' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. 获取师傅服务信息
    const { data: masterService, error: msError } = await supabase
      .from('master_services')
      .select('*, masters(id, display_name, email)')
      .eq('id', master_service_id)
      .eq('is_active', true)
      .single()

    if (msError || !masterService) {
      return NextResponse.json(
        { error: 'Service not found or inactive' },
        { status: 404 }
      )
    }

    // 2. 从请求头获取当前用户信息（通过 Supabase Auth）
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null
    let userEmail: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (!authError && user) {
        userId = user.id
        userEmail = user.email || ''
      }
    }

    // 如果没有认证用户，返回错误（需要登录才能创建订单）
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 3. 获取或创建用户的 profile 记录
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, stripe_customer_id')
      .eq('id', userId)
      .single()

    // 如果没有 profile，创建一个
    if (!profile) {
      await supabase.from('profiles').insert({
        id: userId,
        email: userEmail || '',
        full_name: '',
        timezone: 'Asia/Hong_Kong',
        locale: 'zh',
      })
    }

    // 4. 创建订单
    const now = new Date().toISOString()
    const orderData = {
      user_id: userId,
      master_id: master_id,
      service_id: masterService.service_id,
      type: type,
      service_name: masterService.name,
      status: 'pending',
      amount: masterService.price,
      currency: masterService.currency || 'HKD',
      duration_minutes: masterService.duration_minutes,
      response_deadline: type === 'message'
        ? new Date(Date.now() + masterService.response_hours * 3600000).toISOString()
        : null,
      created_at: now,
      updated_at: now,
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order', details: orderError.message },
        { status: 500 }
      )
    }

    // 5. 创建 Stripe Checkout Session
    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chuhai-eight.vercel.app'

    // 获取或创建 Stripe Customer
    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || '',
        metadata: { user_id: userId },
      })
      customerId = customer.id
      // 更新 profile
      await supabase.from('profiles').update({
        stripe_customer_id: customerId,
        updated_at: now,
      }).eq('id', userId)
    }

    // 转换金额
    const stripeAmount = convertToStripeAmount(masterService.price, masterService.currency || 'HKD')

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: (masterService.currency || 'HKD').toLowerCase(),
            product_data: {
              name: masterService.name,
              description: `${masterService.masters?.display_name || 'Master'} — ${type === 'message' ? '留言咨询' : '预约咨询'}`,
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
        user_id: userId,
        master_id: master_id,
        master_service_id: master_service_id,
        service_type: type,
        original_amount: String(masterService.price),
      },
      customer_email: userEmail || undefined,
    })

    // 更新订单，保存 session ID
    await supabase.from('orders').update({
      stripe_payment_intent_id: session.id,
      updated_at: now,
    }).eq('id', order.id)

    return NextResponse.json({
      success: true,
      order: order,
      sessionId: session.id,
      checkoutUrl: session.url,
    })
  } catch (error: any) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/orders
 * 获取当前用户的订单列表
 */
export async function GET(request: Request) {
  try {
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // ===== P1: 按 master_slug 查询（无需认证）=====
    const masterSlug = searchParams.get('master_slug')
    if (masterSlug) {
      let query = supabase
        .from('orders')
        .select(`
          *,
          messages(*)
        `)
        .eq('master_slug', masterSlug)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) query = query.eq('status', status)
      if (type) query = query.eq('type', type)

      const { data: orders, error } = await query
      if (error) {
        console.error('Error fetching master orders:', error)
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
      }
      return NextResponse.json({ orders: orders || [], limit, offset })
    }

    // ===== P1: 按 user_email 查询（无需认证）=====
    const userEmailParam = searchParams.get('user_email')
    if (userEmailParam) {
      let query = supabase
        .from('orders')
        .select(`
          *,
          messages(*)
        `)
        .eq('user_email', userEmailParam)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status) query = query.eq('status', status)
      if (type) query = query.eq('type', type)

      const { data: orders, error } = await query
      if (error) {
        console.error('Error fetching user orders:', error)
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
      }
      return NextResponse.json({ orders: orders || [], limit, offset })
    }

    // ===== 原有模式：通过 Supabase Auth 获取用户 =====
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    let query = supabase
      .from('orders')
      .select(`*, master:masters(id, display_name, avatar_url), user:profiles(id, email, full_name)`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('type', type)

    const { data: orders, error } = await query
    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return NextResponse.json({
      orders: orders || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders', message: error.message }, { status: 500 })
  }
}
