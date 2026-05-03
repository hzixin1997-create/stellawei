import { Resend } from 'resend'

// 延迟初始化 Resend 客户端
let resendInstance: Resend | null = null

export const getResend = (): Resend => {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable')
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

const FROM_EMAIL = 'Stellawei <noreply@stellawei.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chuhai-eight.vercel.app'

// ==================== 邮件模板 ====================

interface EmailTemplate {
  subject: string
  html: string
}

// 1. 用户付款确认邮件
export function orderConfirmationEmail(
  userName: string,
  orderId: string,
  serviceName: string,
  masterName: string,
  amount: number,
  currency: string
): EmailTemplate {
  return {
    subject: `订单确认 — ${serviceName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #6b4c3b;">感谢您的订单！</h2>
        <p>Hi ${userName || 'there'},</p>
        <p>您的咨询订单已确认。以下是订单详情：</p>
        <div style="background: #f9f5f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>服务：</strong>${serviceName}</p>
          <p><strong>师傅：</strong>${masterName}</p>
          <p><strong>金额：</strong>${currency} ${amount}</p>
        </div>
        <p>您可以随时查看订单状态：</p>
        <a href="${APP_URL}/order/${orderId}" style="display: inline-block; background: #6b4c3b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 0;">查看订单</a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Stellawei — 连接东西方智慧的命理咨询平台</p>
      </div>
    `
  }
}

// 2. 新订单通知师傅
export function newOrderNotificationEmail(
  masterName: string,
  orderId: string,
  serviceName: string,
  serviceType: string
): EmailTemplate {
  const actionText = serviceType === 'message' 
    ? '用户已付款，等待提交问题。' 
    : '用户已付款并预约了时段。'
  
  return {
    subject: `新订单 — ${serviceName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #6b4c3b;">您有一个新订单</h2>
        <p>Hi ${masterName},</p>
        <p>有客户购买了您的服务：</p>
        <div style="background: #f9f5f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>服务：</strong>${serviceName}</p>
          <p><strong>类型：</strong>${serviceType === 'message' ? '留言咨询' : '预约咨询'}</p>
          <p><strong>状态：</strong>${actionText}</p>
        </div>
        <a href="${APP_URL}/master/orders/${orderId}" style="display: inline-block; background: #6b4c3b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 0;">查看订单</a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Stellawei 师傅后台</p>
      </div>
    `
  }
}

// 3. 用户提交问题后通知师傅
export function userQuestionSubmittedEmail(
  masterName: string,
  orderId: string,
  serviceName: string
): EmailTemplate {
  return {
    subject: `客户已提交问题 — ${serviceName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #6b4c3b;">客户已提交问题</h2>
        <p>Hi ${masterName},</p>
        <p>您的留言咨询订单收到了客户的问题，请在48小时内回复。</p>
        <div style="background: #f9f5f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>服务：</strong>${serviceName}</p>
          <p><strong>回复时限：</strong>48小时</p>
        </div>
        <a href="${APP_URL}/master/orders/${orderId}" style="display: inline-block; background: #6b4c3b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 0;">立即回复</a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Stellawei 师傅后台</p>
      </div>
    `
  }
}

// 4. 师傅回复后通知用户
export function masterResponseNotificationEmail(
  userName: string,
  orderId: string,
  serviceName: string,
  masterName: string
): EmailTemplate {
  return {
    subject: `您的咨询已有回复 — ${serviceName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #6b4c3b;">您的咨询已有回复</h2>
        <p>Hi ${userName || 'there'},</p>
        <p>${masterName} 已经回复了您的问题，请查看：</p>
        <div style="background: #f9f5f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>服务：</strong>${serviceName}</p>
          <p><strong>师傅：</strong>${masterName}</p>
        </div>
        <a href="${APP_URL}/order/${orderId}" style="display: inline-block; background: #6b4c3b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 0;">查看回复</a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Stellawei — 连接东西方智慧的命理咨询平台</p>
      </div>
    `
  }
}

// 5. 订单完成通知
export function orderCompletedEmail(
  userName: string,
  orderId: string,
  serviceName: string,
  masterName: string
): EmailTemplate {
  return {
    subject: `订单已完成 — ${serviceName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #6b4c3b;">订单已完成</h2>
        <p>Hi ${userName || 'there'},</p>
        <p>您的咨询订单已完成，感谢使用 Stellawei！</p>
        <div style="background: #f9f5f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>服务：</strong>${serviceName}</p>
          <p><strong>师傅：</strong>${masterName}</p>
        </div>
        <p>如果您对本次咨询满意，欢迎给我们评价或再次预约。</p>
        <a href="${APP_URL}/order/${orderId}" style="display: inline-block; background: #6b4c3b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 0;">查看订单</a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Stellawei — 连接东西方智慧的命理咨询平台</p>
      </div>
    `
  }
}

// 6. 48小时提醒师傅
export function masterReminderEmail(
  masterName: string,
  orderId: string,
  serviceName: string
): EmailTemplate {
  return {
    subject: `【提醒】待回复订单即将超时 — ${serviceName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333;">
        <h2 style="color: #c0392b;">⏰ 待回复订单即将超时</h2>
        <p>Hi ${masterName},</p>
        <p>您有一个留言咨询订单即将超过48小时回复时限，请尽快处理：</p>
        <div style="background: #fff3cd; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #c0392b;">
          <p><strong>服务：</strong>${serviceName}</p>
          <p><strong>状态：</strong>⚠️ 即将超时</p>
        </div>
        <a href="${APP_URL}/master/orders/${orderId}" style="display: inline-block; background: #c0392b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 8px 0;">立即回复</a>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Stellawei 师傅后台</p>
      </div>
    `
  }
}

// ==================== 发送函数 ====================

export async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend()
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      html: template.html,
    })
    return { success: true }
  } catch (error: any) {
    console.error('Email send failed:', error)
    return { success: false, error: error.message }
  }
}

// 批量发送（用于通知）
export async function sendBulkEmails(
  recipients: { email: string; template: EmailTemplate }[]
): Promise<{ success: boolean; results: { email: string; success: boolean; error?: string }[] }> {
  const results = []
  for (const { email, template } of recipients) {
    const result = await sendEmail(email, template)
    results.push({ email, success: result.success, error: result.error })
  }
  return {
    success: results.every(r => r.success),
    results
  }
}
