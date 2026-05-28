import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/complete-expired-bookings
 * 兜底机制：自动标记已过期的订单为 completed
 * 应由外部 cron 服务（如 Vercel Cron / GitHub Actions）每小时调用一次
 */
export async function POST(request: Request) {
  try {
    // 简单的 cron secret 验证（防止被恶意调用）
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // 找出所有 status=confirmed/in_progress 且已过期的订单
    // scheduled_at + duration_minutes < now
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, scheduled_at, duration_minutes, status')
      .in('status', ['confirmed', 'in_progress'])
      .lt('scheduled_at', now)
      .not('duration_minutes', 'is', null)

    if (fetchError) {
      console.error('[cron] fetch expired bookings error:', fetchError)
      return NextResponse.json({ error: 'Fetch failed', details: fetchError.message }, { status: 500 })
    }

    // 过滤出真正过期的（scheduled_at + duration_minutes < now）
    const toComplete = (expiredBookings || []).filter((b: any) => {
      const scheduledTime = new Date(b.scheduled_at).getTime()
      const endTime = scheduledTime + (b.duration_minutes || 25) * 60 * 1000
      return Date.now() > endTime
    })

    if (toComplete.length === 0) {
      return NextResponse.json({ success: true, completed: 0, message: 'No expired bookings' })
    }

    // 批量更新为 completed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed', updated_at: now })
      .in('id', toComplete.map((b: any) => b.id))

    if (updateError) {
      console.error('[cron] update bookings error:', updateError)
      return NextResponse.json({ error: 'Update failed', details: updateError.message }, { status: 500 })
    }

    console.log(`[cron] Auto-completed ${toComplete.length} expired bookings:`, toComplete.map((b: any) => b.id))

    return NextResponse.json({
      success: true,
      completed: toComplete.length,
      bookings: toComplete.map((b: any) => b.id),
    })
  } catch (error: any) {
    console.error('[cron] complete-expired error:', error)
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 })
  }
}
