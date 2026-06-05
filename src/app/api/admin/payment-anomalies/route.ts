import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * GET /api/admin/payment-anomalies
 * 检测支付异常订单
 * 
 * 异常类型：
 * 1. payment_status=paid 但 status=pending（支付成功但订单未确认）
 * 2. 存在 payment_logs failed 记录（Webhook 处理失败）
 * 3. expires_at 已过期但 payment_status 仍为 pending（可能已支付但未同步）
 */
export async function GET(request: Request) {
  try {
    const supabase = createServiceClient()
    const anomalies: any[] = []

    // 1. 支付成功但订单状态未更新
    const { data: paidButPending } = await supabase
      .from('bookings')
      .select('id, status, payment_status, payment_sync_status, scheduled_date, scheduled_time, master_id, total_amount, user_id, created_at, expires_at')
      .eq('payment_status', 'paid')
      .eq('status', 'pending')
      .limit(50)

    if (paidButPending) {
      paidButPending.forEach((b: any) => {
        anomalies.push({
          type: 'paid_but_pending',
          severity: 'high',
          bookingId: b.id,
          description: 'Payment successful but booking status still pending',
          booking: b,
          suggestion: 'Auto-fix: update status to confirmed',
        })
      })
    }

    // 2. 同步失败状态（payment_sync_status = failed）
    const { data: syncFailed } = await supabase
      .from('bookings')
      .select('id, status, payment_status, payment_sync_status, stripe_session_id, scheduled_date, scheduled_time, master_id, total_amount, user_id, created_at, expires_at')
      .eq('payment_sync_status', 'failed')
      .limit(50)

    if (syncFailed) {
      syncFailed.forEach((b: any) => {
        anomalies.push({
          type: 'sync_failed',
          severity: 'high',
          bookingId: b.id,
          description: `Payment sync failed: stripe_session_id=${b.stripe_session_id?.slice(0, 8) || 'N/A'}`,
          booking: b,
          suggestion: 'Check Stripe Dashboard and retry sync',
        })
      })
    }

    // 3. Webhook 处理失败（最近24小时）
    const { data: failedWebhooks } = await supabase
      .from('payment_logs')
      .select('*, bookings(id, status, payment_status, master_id, total_amount)')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (failedWebhooks) {
      failedWebhooks.forEach((log: any) => {
        anomalies.push({
          type: 'webhook_failed',
          severity: 'high',
          bookingId: log.booking_id,
          description: `Webhook failed: ${log.error_message}`,
          log: log,
          suggestion: 'Check webhook logs and retry',
        })
      })
    }

    // 4. 支付超过5分钟未同步（有 stripe_session_id 但 payment_sync_status 仍为 pending）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: stalePending } = await supabase
      .from('bookings')
      .select('id, status, payment_status, payment_sync_status, stripe_session_id, scheduled_date, scheduled_time, master_id, total_amount, user_id, created_at, expires_at, last_payment_check_at')
      .eq('payment_status', 'pending')
      .eq('payment_sync_status', 'pending')
      .not('stripe_session_id', 'is', null)
      .lt('last_payment_check_at', fiveMinutesAgo)
      .limit(50)

    if (stalePending) {
      stalePending.forEach((b: any) => {
        anomalies.push({
          type: 'stale_pending',
          severity: 'medium',
          bookingId: b.id,
          description: 'Payment pending for >5 min with stripe_session_id but never synced',
          booking: b,
          suggestion: 'Check Stripe Dashboard for payment status',
        })
      })
    }

    // 5. 已过期但可能已支付（需要人工检查 Stripe）
    // 注意：排除 stripe_payment_intent_id IS NULL 的（用户未完成支付）
    const { data: expiredButMaybePaid } = await supabase
      .from('bookings')
      .select('id, status, payment_status, payment_sync_status, stripe_session_id, scheduled_date, scheduled_time, master_id, total_amount, user_id, created_at, expires_at')
      .eq('payment_status', 'pending')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .not('stripe_session_id', 'is', null)
      .limit(50)

    if (expiredButMaybePaid) {
      expiredButMaybePaid.forEach((b: any) => {
        anomalies.push({
          type: 'expired_maybe_paid',
          severity: 'medium',
          bookingId: b.id,
          description: 'Booking expired but might have been paid',
          booking: b,
          suggestion: 'Check Stripe Dashboard for payment status',
        })
      })
    }

    return NextResponse.json({
      anomalies,
      count: anomalies.length,
      highSeverity: anomalies.filter((a: any) => a.severity === 'high').length,
      mediumSeverity: anomalies.filter((a: any) => a.severity === 'medium').length,
    })
  } catch (error: any) {
    console.error('Payment anomalies check error:', error)
    return NextResponse.json(
      { error: 'Failed to check anomalies', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/payment-anomalies
 * 批量修复异常订单
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, bookingIds } = body

    if (!action || !bookingIds || !Array.isArray(bookingIds)) {
      return NextResponse.json(
        { error: 'Missing action or bookingIds' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const results: any[] = []

    for (const bookingId of bookingIds) {
      try {
        if (action === 'auto_fix') {
          // 自动修复：paid + pending → confirmed
          const { data, error } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)
            .eq('payment_status', 'paid')
            .eq('status', 'pending')
            .select('id, status, payment_status')
            .single()

          if (error) throw error
          results.push({ bookingId, action, success: true, data })
        } else if (action === 'sync_stripe') {
          // 同步 Stripe 状态（需要调用 Stripe API 检查）
          results.push({ bookingId, action, success: false, error: 'Not implemented' })
        }
      } catch (err: any) {
        results.push({ bookingId, action, success: false, error: err.message })
      }
    }

    return NextResponse.json({ results, fixed: results.filter((r: any) => r.success).length })
  } catch (error: any) {
    console.error('Fix anomalies error:', error)
    return NextResponse.json(
      { error: 'Failed to fix anomalies', message: error.message },
      { status: 500 }
    )
  }
}
