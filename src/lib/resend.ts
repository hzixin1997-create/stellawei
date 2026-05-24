import { Resend } from 'resend';

// Resend 配置（延迟初始化，避免构建时报错）
let resendInstance: Resend | null = null;

function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY not configured - email sending unavailable');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// 邮件模板类型
interface EmailTemplate { subject: string; html: string; }

// 发送邮件通用方法（支持新旧两种签名）
export async function sendEmail(
  toOrParams: string | { to: string; subject: string; html: string; from?: string },
  template?: EmailTemplate
) {
  try {
    let to: string, subject: string, html: string, from: string;

    if (typeof toOrParams === 'string' && template) {
      // 旧签名：sendEmail(to, template)
      to = toOrParams;
      subject = template.subject;
      html = template.html;
      from = 'Stellawei <noreply@stellawei.org>';
    } else if (typeof toOrParams === 'object') {
      // 新签名：sendEmail({to, subject, html, from})
      to = toOrParams.to;
      subject = toOrParams.subject;
      html = toOrParams.html;
      from = toOrParams.from || 'Stellawei <noreply@stellawei.org>';
    } else {
      throw new Error('Invalid sendEmail arguments');
    }

    const { data, error } = await getResend().emails.send({ from, to, subject, html });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Send email failed:', err);
    throw err;
  }
}

// 预约确认邮件（发给用户）
export async function sendBookingConfirmationToUser({
  userEmail,
  userName,
  masterName,
  serviceType,
  scheduledAt,
  price,
}: {
  userEmail: string;
  userName: string;
  masterName: string;
  serviceType: string;
  scheduledAt: string;
  price: number;
}) {
  return sendEmail({
    to: userEmail,
    subject: 'Your Consultation is Confirmed - Stellawei',
    html: `
      <h2>Hello ${userName},</h2>
      <p>Your consultation has been confirmed!</p>
      <ul>
        <li><strong>Master:</strong> ${masterName}</li>
        <li><strong>Service:</strong> ${serviceType}</li>
        <li><strong>Date:</strong> ${new Date(scheduledAt).toLocaleString()}</li>
        <li><strong>Price:</strong> $${price}</li>
      </ul>
      <p>You will receive a reminder before the session starts.</p>
      <p>Best,<br/>Stellawei Team</p>
    `,
  });
}

// 新订单通知（发给师傅）
export async function sendNewBookingToMaster({
  masterEmail,
  masterName,
  userName,
  serviceType,
  scheduledAt,
  price,
}: {
  masterEmail: string;
  masterName: string;
  userName: string;
  serviceType: string;
  scheduledAt: string;
  price: number;
}) {
  return sendEmail({
    to: masterEmail,
    subject: 'New Booking - Stellawei',
    html: `
      <h2>Hello ${masterName},</h2>
      <p>You have a new booking!</p>
      <ul>
        <li><strong>Client:</strong> ${userName}</li>
        <li><strong>Service:</strong> ${serviceType}</li>
        <li><strong>Date:</strong> ${new Date(scheduledAt).toLocaleString()}</li>
        <li><strong>Your earnings (70%):</strong> $${(price * 0.7).toFixed(2)}</li>
      </ul>
      <p>Please log in to your dashboard to confirm.</p>
      <p>Best,<br/>Stellawei Team</p>
    `,
  });
}

// ===== 兼容旧路由的模板函数 =====

export function userQuestionSubmittedEmail(
  masterName: string,
  orderId: string,
  serviceName: string
): EmailTemplate {
  return {
    subject: `[Stellawei] New Question Submitted — Order #${orderId.slice(0, 8)}`,
    html: `
      <h2>Hello ${masterName},</h2>
      <p>A client has submitted a question for your consultation.</p>
      <ul>
        <li><strong>Order:</strong> #${orderId.slice(0, 8)}</li>
        <li><strong>Service:</strong> ${serviceName}</li>
      </ul>
      <p>Please log in to reply.</p>
    `,
  };
}

export function masterResponseNotificationEmail(
  _userName: string,
  orderId: string,
  serviceName: string,
  masterName: string
): EmailTemplate {
  return {
    subject: `[Stellawei] Your Consultation Reply — Order #${orderId.slice(0, 8)}`,
    html: `
      <h2>Hello,</h2>
      <p>Your consultant ${masterName} has replied to your question.</p>
      <ul>
        <li><strong>Order:</strong> #${orderId.slice(0, 8)}</li>
        <li><strong>Service:</strong> ${serviceName}</li>
      </ul>
      <p>Log in to view the full reply.</p>
    `,
  };
}

export function orderCompletedEmail(
  userName: string,
  orderId: string,
  serviceName: string,
  masterName: string
): EmailTemplate {
  return {
    subject: `[Stellawei] Consultation Completed — Order #${orderId.slice(0, 8)}`,
    html: `
      <h2>Hello ${userName || ''},</h2>
      <p>Your consultation with ${masterName} has been completed.</p>
      <ul>
        <li><strong>Order:</strong> #${orderId.slice(0, 8)}</li>
        <li><strong>Service:</strong> ${serviceName}</li>
      </ul>
      <p>Thank you for using Stellawei!</p>
    `,
  };
}

// 新订单通知（发给黄总管理员）
export async function sendAdminNotification({
  consultationId,
  userEmail,
  masterName,
  serviceType,
  price,
}: {
  consultationId: string;
  userEmail: string;
  masterName: string;
  serviceType: string;
  price: number;
}) {
  return sendEmail({
    to: process.env.ADMIN_EMAIL || 'hzixin1997@gmail.com',
    subject: `[Stellawei] New Order #${consultationId.slice(0, 8)}`,
    html: `
      <h2>New Order Alert</h2>
      <ul>
        <li><strong>Order ID:</strong> ${consultationId}</li>
        <li><strong>Client:</strong> ${userEmail}</li>
        <li><strong>Master:</strong> ${masterName}</li>
        <li><strong>Service:</strong> ${serviceType}</li>
        <li><strong>Revenue:</strong> $${price}</li>
        <li><strong>Platform (30%):</strong> $${(price * 0.3).toFixed(2)}</li>
      </ul>
    `,
  });
}
