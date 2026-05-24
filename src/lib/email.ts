import { Resend } from 'resend';

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
  const resend = getResend();

  if (!resend) {
    console.error('RESEND_API_KEY not configured');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const subject = isMaster
    ? `⏰ 提醒：您有咨询即将开始（10分钟后）`
    : `⏰ Reminder: Your consultation starts in 10 minutes`;

  const html = isMaster
    ? `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #7c3aed;">🔔 咨询即将开始</h2>
      <p>您好 ${masterName} 师傅，</p>
      <p>您有一个咨询将在 <strong>10分钟后</strong>开始：</p>
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
      <p>Your consultation with <strong>${masterName}</strong> will begin in <strong>10 minutes</strong>:</p>
      <ul>
        <li><strong>Service:</strong> ${serviceName}</li>
        <li><strong>Time:</strong> ${scheduledDate} ${scheduledTime} (${timezone})</li>
      </ul>
      <p>Please join the chat room:</p>
      <a href="${chatUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Enter Chat Room</a>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">Stellawei Divination Platform</p>
    </div>
    `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Stellawei <noreply@stellawei.org>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend send error:', error);
      return { success: false, error: error.message };
    }

    console.log('Resend send success:', data?.id);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error('Send email exception:', err);
    return { success: false, error: err.message };
  }
}
