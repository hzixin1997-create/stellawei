import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { TimeEngine } from '@/lib/timeEngine';
import { getMessage } from '@/lib/i18n';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

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
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', new Request('http://localhost')) }, { status: 401 })
    }

    const supabase = createServiceClient()
    const now = Date.now()

    // 严格：查询 status=ended 或 in_progress，且 TimeEngine 判断为 completed
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, scheduled_at, duration_minutes, status')
      .in('status', ['in_progress', 'ended'])
      .not('duration_minutes', 'is', null)

    if (fetchError) {
      console.error('[cron] fetch expired bookings error:', fetchError)
      return NextResponse.json({ error: getMessage('COMPLETE_EXPIRED_FAILED', new Request('http://localhost')), details: fetchError.message }, { status: 500 })
    }

    // 使用 TimeEngine 严格过滤：状态为 completed
    const toComplete = (expiredBookings || []).filter((b: any) => {
      const state = TimeEngine.getSessionState({
        scheduled_at: b.scheduled_at,
        duration_minutes: b.duration_minutes,
        status: b.status,
      }, now)
      return state === 'completed'
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
      return NextResponse.json({ error: getMessage('COMPLETE_EXPIRED_FAILED', new Request('http://localhost')), details: updateError.message }, { status: 500 })
    }

    console.log(`[cron] Auto-completed ${toComplete.length} expired bookings:`, toComplete.map((b: any) => b.id))

    return NextResponse.json({
      success: true,
      completed: toComplete.length,
      bookings: toComplete.map((b: any) => b.id),
    })
  } catch (error: any) {
    console.error('[cron] complete-expired error:', error)
    Sentry.captureException(error, {
      tags: { api: 'cron/complete-expired-bookings', component: 'cron' },
    });
    return NextResponse.json({ error: getMessage('INTERNAL_ERROR', new Request('http://localhost')), message: error.message }, { status: 500 })
  }
}