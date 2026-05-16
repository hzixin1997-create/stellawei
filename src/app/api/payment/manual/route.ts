import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// 延迟初始化 Resend（避免 build 时因缺少 API key 报错）
let resend: any = null
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    const { Resend } = require('resend')
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// 管理员邮箱（黄子馨）
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hzixin1997@gmail.com'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      bookingId,
      userEmail,
      userName,
      masterName,
      serviceName,
      scheduledDate,
      scheduledTime,
      amount,
      currency = 'USD',
      isFirstTime = false,
    } = body

    if (!bookingId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. 更新 booking 状态为 pending_payment（等待人工确认收款）
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'pending_payment',
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error updating booking:', updateError)
      throw updateError
    }

    // 2. 发邮件通知管理员（黄子馨）有新预约待确认
    try {
      const resendClient = getResend()
      if (!resendClient) {
      // Resend not configured, skip admin notification
      // In production, this should not happen - ensure RESEND_API_KEY is set
      } else {
        const orderNumber = `CH-${bookingId.slice(0, 8).toUpperCase()}`
        
        await resendClient.emails.send({
          from: 'Stellawei <notifications@stellawei.com>',
          to: ADMIN_EMAIL,
          subject: `[Stellawei] 新预约待确认 - ${orderNumber}`,
          html: `
            <h2>🔔 新预约待确认收款</h2>
            <p><strong>订单号:</strong> ${orderNumber}</p>
            <p><strong>用户:</strong> ${userName || userEmail} (${userEmail})</p>
            <p><strong>师傅:</strong> ${masterName}</p>
            <p><strong>服务:</strong> ${serviceName}</p>
            <p><strong>预约时间:</strong> ${scheduledDate} ${scheduledTime}</p>
            <p><strong>金额:</strong> $${amount} ${currency} ${isFirstTime ? '(首次用户优惠)' : ''}</p>
            <hr/>
            <p><strong>操作:</strong> 请通过 Supabase Dashboard 确认收款后，手动将订单状态改为 confirmed。</p>
            <p><a href="https://supabase.com/dashboard/project/qkbkagkalygnfkdiihcak/editor" target="_blank">打开 Supabase 后台 →</a></p>
          `,
        })
        
      // Admin notification sent successfully
      }
    } catch (emailError) {
      console.error('Failed to send admin email:', emailError)
      // 邮件失败不影响主流程
    }

    return NextResponse.json({
      success: true,
      bookingId,
      status: 'pending_payment',
      message: 'Booking created, awaiting payment confirmation',
    })
  } catch (error: any) {
    console.error('Error in manual payment flow:', error)
    return NextResponse.json(
      { error: 'Failed to process booking', message: error.message },
      { status: 500 }
    )
  }
}
