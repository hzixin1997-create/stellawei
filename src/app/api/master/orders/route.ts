import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * GET /api/master/orders
 * 师傅获取分配到的订单列表
 */
export async function GET(request: Request) {
  try {
    const supabase = createServiceClient()

    // 获取当前用户
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // 获取师傅 ID
    const { data: master, error: masterError } = await supabase
      .from('masters')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (masterError || !master) {
      return NextResponse.json(
        { error: 'Master profile not found' },
        { status: 404 }
      )
    }

    // 查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 构建查询
    let query = supabase
      .from('orders')
      .select(`
        *,
        user:profiles(id, email, full_name, avatar_url)
      `)
      .eq('master_id', master.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (type) {
      query = query.eq('type', type)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Error fetching master orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // 获取统计
    const { data: stats, error: statsError } = await supabase
      .from('orders')
      .select('status')
      .eq('master_id', master.id)

    const statusCounts = stats?.reduce((acc: any, order: any) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      orders: orders || [],
      stats: {
        total: stats?.length || 0,
        ...statusCounts,
      },
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Error fetching master orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders', message: error.message },
      { status: 500 }
    )
  }
}
