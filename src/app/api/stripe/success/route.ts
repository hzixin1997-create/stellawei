import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

/**
 * POST /api/stripe/success
 * 验证Stripe支付状态并更新booking（webhook的fallback）
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

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed', status: session.payment_status },
        { status: 400 }
      )
    }

    // 2. 获取booking_id
    const bookingId = session.metadata?.booking_id
    if (!bookingId) {
      return NextResponse.json(
        { error: 'No booking_id in session metadata' },
        { status: 400 }
      )
    }

    // 3. 更新booking状态（幂等）
    const supabase = createServiceClient()
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        stripe_payment_intent_id: session.payment_intent as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .in('payment_status', ['pending', 'pending_payment']) // 幂等：只有未支付的才更新
      .select('*')
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json(
        { error: 'Failed to update booking status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      bookingId: booking?.id,
      paymentStatus: 'paid',
      message: 'Payment verified and booking confirmed',
    })
  } catch (error: any) {
    console.error('Stripe success API error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment', message: error.message },
      { status: 500 }
    )
  }
}
