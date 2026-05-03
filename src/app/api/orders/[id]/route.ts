import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

/**
 * GET /api/orders/[id]
 * 获取订单详情
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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

    // 查询订单（用户只能看自己的，师傅只能看分配到的）
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        master:masters(id, display_name, avatar_url, email, specialties, bio),
        user:profiles(id, email, full_name, avatar_url)
      `)
      .eq('id', id)
      .or(`user_id.eq.${user.id},master_id.in.(select id from masters where user_id = '${user.id}')`)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error: any) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/orders/[id]
 * 更新订单状态（师傅标记完成等）
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status, notes } = body

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

    const now = new Date().toISOString()

    // 检查用户是否有权限更新此订单
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id, master_id')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // 验证权限：用户只能更新自己的，师傅只能更新分配到的
    const isOwner = order.user_id === user.id
    const isMaster = await supabase
      .from('masters')
      .select('id')
      .eq('id', order.master_id)
      .eq('user_id', user.id)
      .single()
      .then(r => !!r.data)

    if (!isOwner && !isMaster) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // 构建更新数据
    const updateData: any = {
      updated_at: now,
    }

    if (status) {
      updateData.status = status
      if (status === 'completed') {
        updateData.completed_at = now
      }
      if (status === 'cancelled') {
        updateData.cancelled_at = now
      }
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update order', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error: any) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Failed to update order', message: error.message },
      { status: 500 }
    )
  }
}
