import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    // 鉴权：验证管理员身份
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = user.email === 'hzixin1997@gmail.com'
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // 获取 URL 参数
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')

    const supabase = createServiceClient()

    let query = supabase
      .from('bookings')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Admin orders fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders })
  } catch (error: any) {
    console.error('Admin orders API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    )
  }
}
