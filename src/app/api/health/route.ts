import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * 系统健康检查API（供外部监控服务调用）
 */
export async function GET() {
  const checks = {
    database: false,
    stripe: false,
    supabase: false,
    timestamp: new Date().toISOString(),
  }

  // 1. 检查数据库连接
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('bookings')
      .select('id')
      .limit(1)
    
    if (!error) {
      checks.database = true
    }
  } catch (err) {
    console.error('[Health] Database check failed:', err)
  }

  // 2. 检查 Stripe API
  try {
    await stripe.balance.retrieve()
    checks.stripe = true
  } catch (err) {
    console.error('[Health] Stripe check failed:', err)
  }

  // 3. 检查 Supabase 连接（用简单的 auth 检查）
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (!error) {
      checks.supabase = true
    }
  } catch (err) {
    console.error('[Health] Supabase check failed:', err)
  }

  const allHealthy = checks.database && checks.stripe && checks.supabase

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      uptime: process.uptime(),
    },
    { status: allHealthy ? 200 : 503 }
  )
}
