import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

/**
 * POST /api/stripe/success
 * 查询Stripe支付状态（只读，不更新订单）
 * 支付状态更新由 Webhook 负责
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      )
    }

    // 1. 从Stripe查询session状态
    const session = await stripe.checkout.sessions.retrieve(session_id)

    // 2. 获取booking_id
    const bookingId = session.metadata?.booking_id
    if (!bookingId) {
      return NextResponse.json(
        { error: 'No booking_id in session metadata' },
        { status: 400 }
      )
    }

    // 3. 查询本地booking状态（只读）
    const supabase = createServiceClient()
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status, payment_status, stripe_payment_intent_id, updated_at, total_amount, currency, master_id')
      .eq('id', bookingId)
      .single()

    if (fetchError) {
      console.error('Error fetching booking:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch booking status' },
        { status: 500 }
      )
    }

    // 获取师傅信息
    const { data: master } = await supabase
      .from('masters')
      .select('display_name')
      .eq('id', booking?.master_id)
      .single()

    // 4. 返回当前状态
    return NextResponse.json({
      success: session.payment_status === 'paid',
      bookingId: booking?.id,
      paymentStatus: booking?.payment_status || session.payment_status,
      stripeStatus: session.payment_status,
      masterName: master?.display_name || booking?.master_id,
      price: booking?.total_amount || 0,
      currency: booking?.currency || 'usd',
      message: session.payment_status === 'paid' 
        ? 'Payment verified' 
        : 'Payment pending, please wait for confirmation',
    })
  } catch (error: any) {
    console.error('Stripe success API error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment', message: error.message },
      { status: 500 }
    )
  }
}
