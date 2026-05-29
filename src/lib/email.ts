import { Resend } from 'resend';
import { sendEmailViaBrevo } from './brevo';

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

interface ReminderEmailProps {
  to: string;
  userName: string;
  masterName: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  isMaster: boolean;
  chatUrl: string;
}

export async function sendConsultationReminder({
  to,
  userName,
  masterName,
  serviceName,
  scheduledDate,
  scheduledTime,
  timezone,
  isMaster,
  chatUrl,
}: ReminderEmailProps) {
  const subject = isMaster
    ? `⏰ 提醒：您有咨询即将开始（15分钟后）`
    : `⏰ Reminder: Your consultation starts in 15 minutes`;

  const html = isMaster
    ? `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #7c3aed;">🔔 咨询即将开始</h2>
      <p>您好 ${masterName} 师傅，</p>
      <p>您有一个咨询将在 <strong>15分钟后</strong>开始：</p>
      <ul>
        <li><strong>服务：</strong> ${serviceName}</li>
        <li><strong>时间：</strong> ${scheduledDate} ${scheduledTime} (${timezone})</li>
        <li><strong>用户：</strong> ${userName}</li>
      </ul>
      <p>请提前进入聊天室准备：</p>
      <a href="${chatUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">进入聊天室</a>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">Stellawei 命理咨询平台</p>
    </div>
    `
    : `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #7c3aed;">🔔 Consultation Reminder</h2>
      <p>Hi ${userName},</p>
      <p>Your consultation with <strong>${masterName}</strong> will begin in <strong>15 minutes</strong>:</p>
      <ul>
        <li><strong>Service:</strong> ${serviceName}</li>
        <li><strong>Time:</strong> ${scheduledDate} ${scheduledTime} (${timezone})</li>
      </ul>
      <p>Please join the chat room:</p>
      <a href="${chatUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Enter Chat Room</a>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">Stellawei Divination Platform</p>
    </div>
    `;

  // ===== 双发机制：Brevo 主（5秒超时）+ Resend 备 =====
  // 1. 先尝试 Brevo（对 QQ/163 送达率更好）
  const brevoResult = await sendEmailViaBrevo({ to, subject, html });
  if (brevoResult.success) {
    console.log('[email] Brevo success →', to, brevoResult.id);
    return { success: true, id: brevoResult.id, provider: 'brevo' };
  }

  // 2. Brevo 失败（超时或错误），fallback 到 Resend
  console.warn('[email] Brevo failed, fallback to Resend:', brevoResult.error);
  const resend = getResend();
  if (!resend) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: `Brevo: ${brevoResult.error}; Resend: API_KEY not configured` };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Stellawei <noreply@stellawei.org>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend send error:', error);
      return { success: false, error: `Brevo: ${brevoResult.error}; Resend: ${error.message}` };
    }

    console.log('[email] Resend fallback success →', to, data?.id);
    return { success: true, id: data?.id, provider: 'resend' };
  } catch (err: any) {
    console.error('Send email exception:', err);
    return { success: false, error: `Brevo: ${brevoResult.error}; Resend: ${err.message}` };
  }
}
