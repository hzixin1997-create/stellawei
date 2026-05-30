import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/complete-expired-bookings
 * 兜底机制：自动标记已过期的订单为 completed
 * 严格：只有 end_time + 5分钟 后才标记 completed
 */
export async function GET(request: Request) {
  return doComplete(null)
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const secret = authHeader ? authHeader.replace('Bearer ', '') : null
  return doComplete(secret)
}

async function doComplete(secret: string | null) {
  try {
    const expectedSecret = process.env.CRON_SECRET
    if (expectedSecret && secret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    const now = Date.now()

    // 严格：查询 status=ended 或 in_progress，且 start_time 至少在 duration+5分钟前
    // 先查出所有可能过期的，再 JS 端精确过滤
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, scheduled_at, duration_minutes, status')
      .in('status', ['in_progress', 'ended'])
      .not('duration_minutes', 'is', null)

    if (fetchError) {
      console.error('[cron] fetch expired bookings error:', fetchError)
      return NextResponse.json({ error: 'Fetch failed', details: fetchError.message }, { status: 500 })
    }

    // 严格过滤：end_time + 5分钟 < now
    const toComplete = (expiredBookings || []).filter((b: any) => {
      const scheduledTime = new Date(b.scheduled_at).getTime()
      const endTime = scheduledTime + (b.duration_minutes || 25) * 60 * 1000
      const bufferEndTime = endTime + 5 * 60 * 1000 // +5分钟缓冲
      return now > bufferEndTime
    })

    if (toComplete.length === 0) {
      return NextResponse.json({ success: true, completed: 0, message: 'No expired bookings' })
    }

    // 批量更新为 completed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
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
