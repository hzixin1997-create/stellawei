import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  masterResponseNotificationEmail,
  orderCompletedEmail,
  sendEmail,
} from '@/lib/resend'

/**
 * POST /api/orders/[id]/response
 * 师傅提交回复
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { response, mark_completed = false } = body

    if (!response || response.trim().length < 1) {
      return NextResponse.json(
        { error: 'Response is required' },
        { status: 400 }
      )
    }

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

    // 验证订单存在且师傅有权限
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id, master_id, type, status, service_name, master:masters!inner(display_name), user:profiles!inner(email, full_name)')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // 验证当前用户是此订单的师傅
    const { data: masterCheck } = await supabase
      .from('masters')
      .select('id')
      .eq('id', order.master_id)
      .eq('user_id', user.id)
      .single()

    if (!masterCheck) {
      return NextResponse.json(
        { error: 'Only the assigned master can respond' },
        { status: 403 }
      )
    }

    // 更新订单
    const updateData: any = {
      master_response: response,
      master_response_at: now,
      master_read: true,
      master_read_at: now,
      updated_at: now,
    }

    // 如果标记完成，更新状态
    if (mark_completed) {
      updateData.status = 'completed'
      updateData.completed_at = now
    } else if (order.status === 'assigned') {
      updateData.status = 'in_progress'
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to submit response', details: error.message },
        { status: 500 }
      )
    }

    // 通知用户有回复（异步）
    const userData = order.user as any
    const masterData = order.master as any
    const userEmail = userData?.email
    const userName = userData?.full_name
    const masterName = masterData?.display_name || 'Master'

    if (userEmail) {
      sendEmail(
        userEmail,
        masterResponseNotificationEmail(userName, id, order.service_name, masterName)
      ).catch(err => console.error('Failed to send notification email:', err))
    }

    // 如果标记完成，发送完成通知
    if (mark_completed && userEmail) {
      sendEmail(
        userEmail,
        orderCompletedEmail(userName, id, order.service_name, masterName)
      ).catch(err => console.error('Failed to send completion email:', err))
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (error: any) {
    console.error('Error submitting response:', error)
    return NextResponse.json(
      { error: 'Failed to submit response', message: error.message },
      { status: 500 }
    )
  }
}
