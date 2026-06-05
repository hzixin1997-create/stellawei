import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { RefundEngine } from '@/lib/refundEngine'
import * as Sentry from '@sentry/nextjs'

/**
 * POST /api/payment/refund
 * 用户直接退款（旧 API，兼容）
 * 推荐使用 /api/bookings/[id]/request-refund
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bookingId, reason } = body

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookingId' },
        { status: 400 }
      )
    }

    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, user_id')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const isAdmin = user.email === 'hzixin1997@gmail.com'
    if (booking.user_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'You can only refund your own bookings' }, { status: 403 })
    }

    // 使用 RefundEngine 处理
    const result = await RefundEngine.requestRefund({
      bookingId,
      requestedBy: 'user',
      requestedById: user.id,
      requestedByEmail: user.email || undefined,
      reason,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      refundRequestId: result.refundRequestId,
      status: result.status,
    })
  } catch (error: any) {
    console.error('Error processing refund:', error)
    Sentry.captureException(error, {
      tags: { api: 'payment/refund', component: 'refund' },
      extra: { body: 'refund request' },
    });
    return NextResponse.json(
      { error: 'Failed to process refund', message: error.message },
      { status: 500 }
    )
  }
}
