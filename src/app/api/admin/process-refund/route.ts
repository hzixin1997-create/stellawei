import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/process-refund
 * 总裁处理退款申请（管理员专用）
 */
export async function POST(request: Request) {
  try {
    const stripe = getStripe()
    const body = await request.json()
    const { bookingId } = body

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookingId' },
        { status: 400 }
      )
    }

    // 🔒 鉴权：验证管理员身份
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 总裁邮箱白名单
    const isAdmin = user.email === 'hzixin1997@gmail.com'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // 获取 booking 信息
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // 检查是否是退款申请状态
    if (booking.status !== 'refund_requested' && booking.payment_status !== 'refund_requested') {
      return NextResponse.json(
        { error: 'Booking is not in refund requested status' },
        { status: 400 }
      )
    }

    // 获取 stripe_payment_intent_id
    const paymentIntentId = booking.stripe_payment_intent_id || booking.payment_intent_id

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent not found for this booking' },
        { status: 400 }
      )
    }

    // 创建 Stripe 退款
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        booking_id: bookingId,
        processed_by: user.id,
        user_id: booking.user_id,
      },
    })

    const now = new Date().toISOString()

    // 更新 bookings 表
    await supabase
      .from('bookings')
      .update({
        payment_status: 'refunded',
        status: 'refunded',
        stripe_refund_id: refund.id,
        refunded_at: now,
        updated_at: now,
      })
      .eq('id', bookingId)

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: booking.total_amount,
      currency: booking.currency || 'USD',
      status: refund.status,
    })
  } catch (error: any) {
    console.error('Error processing refund:', error)
    return NextResponse.json(
      { error: 'Failed to process refund', message: error.message },
      { status: 500 }
    )
  }
}
