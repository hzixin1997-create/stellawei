// ============================================================
// 统一邮件内容生成层
// 所有邮件文案必须通过 getEmailContent 生成，禁止业务代码内联 HTML
// ============================================================

export type EmailRole = 'user' | 'master';
export type EmailLanguage = 'zh' | 'en';

export interface EmailContentParams {
  role: EmailRole;
  language: EmailLanguage;
  userName: string;
  masterName: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  chatUrl: string;
}

/**
 * 统一邮件内容生成函数
 * 所有邮件文案的唯一来源
 */
export function getEmailContent({
  role,
  language,
  userName,
  masterName,
  serviceName,
  scheduledDate,
  scheduledTime,
  timezone,
  chatUrl,
}: EmailContentParams): { subject: string; html: string } {
  const isMaster = role === 'master';

  // 语言选择：支持 zh / en / auto
  const lang = language;

  if (isMaster) {
    return getMasterEmail(lang, { masterName, userName, serviceName, scheduledDate, scheduledTime, timezone, chatUrl });
  } else {
    return getUserEmail(lang, { userName, masterName, serviceName, scheduledDate, scheduledTime, timezone, chatUrl });
  }
}

// =========================
// 师傅端邮件（中文优先 + 英文补充）
// =========================
function getMasterEmail(
  lang: EmailLanguage,
  params: {
    masterName: string;
    userName: string;
    serviceName: string;
    scheduledDate: string;
    scheduledTime: string;
    timezone: string;
    chatUrl: string;
  }
): { subject: string; html: string } {
  const { masterName, userName, serviceName, scheduledDate, scheduledTime, timezone, chatUrl } = params;

  const subject = lang === 'en'
    ? `⏰ Reminder: Consultation starts in 15 minutes`
    : `⏰ 提醒：您有咨询即将开始（15分钟后）`;

  const html = lang === 'en'
    ? `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #7c3aed;">🔔 Consultation Reminder</h2>
      <p>Hi ${masterName},</p>
      <p>You have a consultation starting in <strong>15 minutes</strong>:</p>
      <ul>
        <li><strong>Service:</strong> ${serviceName}</li>
        <li><strong>Time:</strong> ${scheduledDate} ${scheduledTime} (${timezone})</li>
        <li><strong>User:</strong> ${userName}</li>
      </ul>
      <p>Please enter the chat room:</p>
      <a href="${chatUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Enter Chat Room</a>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">Stellawei Divination Platform</p>
    </div>`
    : `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
    </div>`;

  return { subject, html };
}

// =========================
// 用户端邮件（中英双文，中文优先）
// =========================
function getUserEmail(
  lang: EmailLanguage,
  params: {
    userName: string;
    masterName: string;
    serviceName: string;
    scheduledDate: string;
    scheduledTime: string;
    timezone: string;
    chatUrl: string;
  }
): { subject: string; html: string } {
  const { userName, masterName, serviceName, scheduledDate, scheduledTime, timezone, chatUrl } = params;

  const subject = lang === 'en'
    ? `⏰ Reminder: Your consultation starts in 15 minutes`
    : `⏰ 提醒：您的咨询即将开始（15分钟后）`;

  // 中文优先：中文主文案 + 英文辅助
  const html = lang === 'en'
    ? `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
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
    </div>`
    : `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #7c3aed;">🔔 咨询即将开始 | Consultation Reminder</h2>
      <p>Hi ${userName}，您好</p>
      <p>您与 <strong>${masterName}</strong> 师傅的咨询将在 <strong>15分钟后</strong>开始。</p>
      <p>Your consultation with <strong>${masterName}</strong> will begin in <strong>15 minutes</strong>:</p>
      <ul>
        <li><strong>服务 Service：</strong> ${serviceName}</li>
        <li><strong>时间 Time：</strong> ${scheduledDate} ${scheduledTime} (${timezone})</li>
      </ul>
      <p>请进入聊天室 / Please join the chat room:</p>
      <a href="${chatUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">进入聊天室 Enter Chat Room</a>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">Stellawei 命理咨询平台 | Divination Platform</p>
    </div>`;

  return { subject, html };
}
