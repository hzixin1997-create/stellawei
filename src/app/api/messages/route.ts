import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendEmail, userQuestionSubmittedEmail, masterResponseNotificationEmail } from '@/lib/resend'

/**
 * POST /api/messages
 * 创建留言（用户提交问题）
 *
 * Body: { order_id: string, user_email: string, content: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, user_email, content } = body

    // === 参数校验 ===
    if (!order_id || !user_email || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, user_email, content' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Content too long (max 5000 characters)' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // 验证订单存在且已付款
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, master_slug, service_name, user_email, master:masters(display_name, email)')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.status !== 'paid' && order.status !== 'assigned') {
      return NextResponse.json(
        { error: 'Order not paid yet, cannot submit message' },
        { status: 400 }
      )
    }

    // 检查是否已有 message 记录（由 webhook 创建或之前提交过）
    const { data: existingMsg } = await supabase
      .from('messages')
      .select('id, content')
      .eq('order_id', order_id)
      .single()

    let message

    if (existingMsg) {
      // 更新已有记录
      const { data: updated, error: updateErr } = await supabase
        .from('messages')
        .update({
          content: content,
          user_email: user_email,
          updated_at: now,
        })
        .eq('id', existingMsg.id)
        .select()
        .single()

      if (updateErr) {
        console.error('Error updating message:', updateErr)
        return NextResponse.json(
          { error: 'Failed to update message', details: updateErr.message },
          { status: 500 }
        )
      }
      message = updated
    } else {
      // 新建记录
      const { data: created, error: createErr } = await supabase
        .from('messages')
        .insert({
          order_id: order_id,
          user_email: user_email,
          content: content,
          status: 'pending',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (createErr) {
        console.error('Error creating message:', createErr)
        return NextResponse.json(
          { error: 'Failed to create message', details: createErr.message },
          { status: 500 }
        )
      }
      message = created
    }

    // 更新订单状态为 assigned（已分配/待回复）
    await supabase
      .from('orders')
      .update({
        status: 'assigned',
        updated_at: now,
      })
      .eq('id', order_id)

    // 异步通知师傅
    const masterEmail = order.master?.[0]?.email || getMasterEmail(order.master_slug)
    if (masterEmail) {
      sendEmail(
        masterEmail,
        userQuestionSubmittedEmail(
          order.master?.[0]?.display_name || order.master_slug || 'Master',
          order_id,
          order.service_name || 'Consultation'
        )
      ).catch(err => console.error('Failed to notify master:', err))
    }

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error: any) {
    console.error('Error in POST /api/messages:', error)
    return NextResponse.json(
      { error: 'Failed to create message', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/messages
 * 师傅回复留言
 *
 * Body: { order_id: string, reply: string }
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { order_id, reply } = body

    // === 参数校验 ===
    if (!order_id || !reply) {
      return NextResponse.json(
        { error: 'Missing required fields: order_id, reply' },
        { status: 400 }
      )
    }

    if (reply.length > 10000) {
      return NextResponse.json(
        { error: 'Reply too long (max 10000 characters)' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    // 获取订单和用户信息（用于邮件通知）
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, user_email, service_name, master_slug, master:masters(display_name)')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // 更新留言
    const { data: message, error } = await supabase
      .from('messages')
      .update({
        reply: reply,
        status: 'replied',
        updated_at: now,
      })
      .eq('order_id', order_id)
      .is('reply', null)
      .select()
      .single()

    if (error) {
      console.error('Error updating message reply:', error)
      return NextResponse.json(
        { error: 'Failed to update message', details: error.message },
        { status: 500 }
      )
    }

    // 同时更新订单状态为 completed
    await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: now,
        updated_at: now,
      })
      .eq('id', order_id)

    // 异步通知用户有回复
    if (order.user_email) {
      sendEmail(
        order.user_email,
        masterResponseNotificationEmail(
          '',
          order_id,
          order.service_name || 'Consultation',
          order.master?.[0]?.display_name || order.master_slug || 'Master'
        )
      ).catch(err => console.error('Failed to notify user:', err))
    }

    return NextResponse.json({
      success: true,
      message,
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/messages:', error)
    return NextResponse.json(
      { error: 'Failed to update message', message: error.message },
      { status: 500 }
    )
  }
}

function getMasterEmail(slug: string | null): string | null {
  const emails: Record<string, string> = {
    'zhang-yihua': 'qimenyihua@gmail.com',
    'wu-yang': 'mshoucangjia@gmail.com',
  }
  return slug ? emails[slug] || null : null
}
