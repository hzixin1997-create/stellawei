import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase'
import { RefundEngine } from '@/lib/refundEngine'
import { getMessage, getLang } from '@/lib/i18n'
import { logAdminAudit } from '@/lib/observability'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/process-refund
 * 总裁处理退款（统一使用 RefundEngine）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bookingId, action, adminNote } = body
    const lang = getLang(request)

    if (!bookingId) {
      return NextResponse.json(
        { error: getMessage('INTERNAL_ERROR', request) },
        { status: 400 }
      )
    }

    // 🔒 鉴权：验证管理员身份
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: getMessage('UNAUTHORIZED', request) },
        { status: 401 }
      )
    }

    const isAdmin = user.email === 'hzixin1997@gmail.com'
    if (!isAdmin) {
      return NextResponse.json(
        { error: getMessage('FORBIDDEN_NOT_MASTER', request) },
        { status: 403 }
      )
    }

    const supabase = createServiceClient()

    // 获取退款请求
    const { data: refundRequest } = await supabase
      .from('refund_requests')
      .select('id, status')
      .eq('booking_id', bookingId)
      .in('status', ['requested', 'under_review', 'approved'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!refundRequest) {
      // 如果没有退款请求记录，直接调用 RefundEngine 处理（兼容旧订单）
      const eligibility = await RefundEngine.checkEligibility(bookingId, 'admin')
      if (!eligibility.canRefund) {
        return NextResponse.json(
          { error: eligibility.reason, code: eligibility.code },
          { status: 400 }
        )
      }

      // 创建退款请求并处理
      const requestResult = await RefundEngine.requestRefund({
        bookingId,
        requestedBy: 'admin',
        requestedById: user.id,
        requestedByEmail: user.email || undefined,
        reason: adminNote || 'Admin force refund',
        lang,
      })

      if (!requestResult.success || !requestResult.refundRequestId) {
        return NextResponse.json(
          { error: requestResult.error || 'Failed to create refund request', code: requestResult.code },
          { status: 400 }
        )
      }

      // 处理退款
      const processResult = await RefundEngine.processRefund({
        refundRequestId: requestResult.refundRequestId,
        bookingId,
        adminId: user.id,
        adminEmail: user.email || undefined,
        action: 'approve',
        adminNote,
        lang,
      })

      return NextResponse.json({
        success: processResult.success,
        refundRequestId: processResult.refundRequestId,
        stripeRefundId: processResult.stripeRefundId,
        status: processResult.status,
        isLegacy: processResult.isLegacy,
        message: processResult.isLegacy
          ? 'Legacy order: marked as refunded without Stripe'
          : processResult.error,
      })
    }

    // 调用 RefundEngine 处理退款
    const result = await RefundEngine.processRefund({
      refundRequestId: refundRequest.id,
      bookingId,
      adminId: user.id,
      adminEmail: user.email || undefined,
      action: action === 'reject' ? 'reject' : 'approve',
      adminNote,
      lang,
    })

    // 记录审计日志
    try {
      await logAdminAudit({
        adminId: user.id,
        adminEmail: user.email || undefined,
        action: action === 'reject' ? 'refund_rejected' : 'refund_processed',
        targetType: 'booking',
        targetId: bookingId,
        beforeState: { refund_status: refundRequest.status },
        afterState: { refund_status: result.status, stripe_refund_id: result.stripeRefundId },
        reason: adminNote || 'Admin processed refund',
      })
    } catch (logErr) {
      console.error('[Admin Refund] Audit log failed:', logErr)
    }

    return NextResponse.json({
      success: result.success,
      refundRequestId: result.refundRequestId,
      stripeRefundId: result.stripeRefundId,
      status: result.status,
      isLegacy: result.isLegacy,
      message: result.status === 'refunded'
        ? 'Refund processed successfully'
        : result.status === 'rejected'
        ? 'Refund request rejected'
        : result.error,
    })
  } catch (error: any) {
    console.error('[Admin Refund API] Error:', error)
    return NextResponse.json(
      { error: getMessage('REFUND_FAILED', request), message: error.message },
      { status: 500 }
    )
  }
}
