import { Resend } from 'resend';

// Resend 配置
export const resend = new Resend(process.env.RESEND_API_KEY!);

// 发送邮件通用方法
export async function sendEmail({
  to,
  subject,
  html,
  from = 'Stellawei <noreply@stellawei.org>',
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

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
