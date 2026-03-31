import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

// 管理员退款 API
export async function POST(request: Request) {
  try {
    const stripe = getStripe()
    const body = await request.json()
    const { bookingId, amount, reason } = body

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookingId' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 获取 booking 信息
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, payments(*)')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // 检查是否已支付
    if (booking.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Booking is not paid, cannot refund' },
        { status: 400 }
      )
    }

    // 获取 payment_intent_id
    const paymentIntentId = booking.payment_intent_id || booking.payments?.[0]?.stripe_payment_intent_id

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent not found for this booking' },
        { status: 400 }
      )
    }

    // 计算退款金额（全额或部分）
    const refundAmount = amount 
      ? Math.round(amount * 100) // 转换为美分
      : undefined // undefined 表示全额退款

    // 创建 Stripe 退款
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: reason || 'requested_by_customer',
      metadata: {
        booking_id: bookingId,
        admin_refund: 'true',
      },
    })

    const now = new Date().toISOString()

    // 更新 bookings 表
    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'refunded',
        status: 'refunded',
        stripe_refund_id: refund.id,
        refunded_at: now,
        updated_at: now,
      })
      .eq('id', bookingId)

    if (updateBookingError) {
      console.error('Error updating booking refund status:', updateBookingError)
    }

    // 更新 payments 表
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: 'refunded',
        stripe_refund_id: refund.id,
        refund_amount: (refundAmount || booking.total_amount) / 100,
        refund_reason: reason,
        updated_at: now,
      })
      .eq('booking_id', bookingId)

    if (updatePaymentError) {
      console.error('Error updating payment refund status:', updatePaymentError)
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refundAmount ? amount : booking.total_amount,
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

// 获取退款状态
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookingId' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 获取 booking 的退款信息
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, payment_status, stripe_refund_id, refunded_at, refund_amount')
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      bookingId: booking.id,
      paymentStatus: booking.payment_status,
      refundId: booking.stripe_refund_id,
      refundedAt: booking.refunded_at,
      refundAmount: booking.refund_amount,
    })
  } catch (error: any) {
    console.error('Error getting refund status:', error)
    return NextResponse.json(
      { error: 'Failed to get refund status', message: error.message },
      { status: 500 }
    )
  }
}
