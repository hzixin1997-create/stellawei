import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  userQuestionSubmittedEmail,
  masterResponseNotificationEmail,
  sendEmail,
} from '@/lib/resend'

/**
 * POST /api/orders/[id]/question
 * 用户提交问题（留言制订单）
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { question, birth_date, birth_time, birth_location } = body

    if (!question || question.trim().length < 10) {
      return NextResponse.json(
        { error: 'Question must be at least 10 characters' },
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

    // 验证订单所有权
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id, master_id, type, status, service_name, master:masters!inner(display_name, email)')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    if (order.type !== 'message') {
      return NextResponse.json(
        { error: 'This order is not a message consultation' },
        { status: 400 }
      )
    }

    // 构建问题文本（包含出生信息）
    let fullQuestion = question
    if (birth_date) {
      fullQuestion += `\n\n出生日期：${birth_date}`
    }
    if (birth_time) {
      fullQuestion += `\n出生时间：${birth_time}`
    }
    if (birth_location) {
      fullQuestion += `\n出生地点：${birth_location}`
    }

    // 更新订单
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update({
        user_question: fullQuestion,
        user_question_submitted_at: now,
        status: 'assigned',
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to submit question', details: error.message },
        { status: 500 }
      )
    }

    // 通知师傅有新问题（异步，不阻塞响应）
    const masterData = order.master as any
    const masterEmail = masterData?.email
    const masterName = masterData?.display_name || 'Master'
    if (masterEmail) {
      sendEmail(
        masterEmail,
        userQuestionSubmittedEmail(masterName, id, order.service_name)
      ).catch(err => console.error('Failed to send notification email:', err))
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
    })
  } catch (error: any) {
    console.error('Error submitting question:', error)
    return NextResponse.json(
      { error: 'Failed to submit question', message: error.message },
      { status: 500 }
    )
  }
}
