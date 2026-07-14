import { Resend } from 'resend';
import { sendEmailViaBrevo } from './brevo';
import { getEmailContent, type EmailRole } from './email-templates';

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

interface SendEmailParams {
  to: string;
  userName: string;
  masterName: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
  timezone: string;
  isMaster: boolean;
  chatUrl: string;
  language?: string;
  bookingId?: string;
}

/**
 * Staging 环境邮件重定向
 * 所有邮件发送给固定开发邮箱，避免打扰真实用户
 */
function redirectStagingEmail(originalTo: string): { to: string; isRedirected: boolean } {
  if (process.env.NEXT_PUBLIC_ENV !== 'staging') {
    return { to: originalTo, isRedirected: false };
  }
  
  // Staging 环境下，所有邮件重定向到开发邮箱
  const stagingEmail = process.env.STAGING_EMAIL || 'staging@stellawei.dev';
  console.log('[email:staging]', `Redirecting email from ${originalTo} to ${stagingEmail}`);
  return { to: stagingEmail, isRedirected: true };
}

export async function sendConsultationReminder({
  to: originalTo,
  userName,
  masterName,
  serviceName,
  scheduledDate,
  scheduledTime,
  timezone,
  isMaster,
  chatUrl,
  language = 'zh',
  bookingId,
}: SendEmailParams): Promise<{ success: boolean; id?: string; provider?: string; error?: string }> {
  const { to, isRedirected } = redirectStagingEmail(originalTo);
  const role: EmailRole = isMaster ? 'master' : 'user';
  const lang = (language === 'en' ? 'en' : 'zh') as 'zh' | 'en';

  // 1. 统一生成邮件内容
  const { subject, html } = getEmailContent({
    role,
    language: lang,
    userName,
    masterName,
    serviceName,
    scheduledDate,
    scheduledTime,
    timezone,
    chatUrl,
  });

  // Staging 环境：邮件标题加标注
  const finalSubject = isRedirected ? `[STAGING] ${subject}` : subject;

  // 2. 发送前日志
  console.log('[email:send]', JSON.stringify({
    bookingId: bookingId || 'unknown',
    role,
    to: originalTo,
    redirectedTo: isRedirected ? to : undefined,
    language: lang,
    isMaster,
    provider: 'brevo',
    timestamp: new Date().toISOString(),
  }));

  // 3. Brevo 主发（5秒超时）
  const brevoResult = await sendEmailViaBrevo({ to, subject: finalSubject, html });
  if (brevoResult.success) {
    console.log('[email:send]', JSON.stringify({
      bookingId: bookingId || 'unknown',
      role,
      to: originalTo,
      result: 'success',
      provider: 'brevo',
      messageId: brevoResult.id,
    }));
    return { success: true, id: brevoResult.id, provider: 'brevo' };
  }

  // 4. Brevo 失败，fallback Resend
  console.warn('[email:send]', JSON.stringify({
    bookingId: bookingId || 'unknown',
    role,
    to: originalTo,
    result: 'brevo_failed',
    error: brevoResult.error,
    fallback: 'resend',
  }));

  const resend = getResend();
  if (!resend) {
    console.error('[email:send]', JSON.stringify({
      bookingId: bookingId || 'unknown',
      role,
      to,
      result: 'failed',
      error: 'RESEND_API_KEY not configured',
    }));
    return { success: false, error: `Brevo: ${brevoResult.error}; Resend: API_KEY not configured`, provider: 'none' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Stellawei <noreply@stellawei.org>',
      to,
      subject: finalSubject,
      html,
    });

    if (error) {
      console.error('[email:send]', JSON.stringify({
        bookingId: bookingId || 'unknown',
        role,
        to,
        result: 'resend_failed',
        error: error.message,
      }));
      return { success: false, error: `Brevo: ${brevoResult.error}; Resend: ${error.message}`, provider: 'resend' };
    }

    console.log('[email:send]', JSON.stringify({
      bookingId: bookingId || 'unknown',
      role,
      to,
      result: 'success',
      provider: 'resend',
      messageId: data?.id,
    }));
    return { success: true, id: data?.id, provider: 'resend' };
  } catch (err: any) {
    console.error('[email:send]', JSON.stringify({
      bookingId: bookingId || 'unknown',
      role,
      to,
      result: 'exception',
      error: err.message,
    }));
    return { success: false, error: `Brevo: ${brevoResult.error}; Resend: ${err.message}`, provider: 'resend' };
  }
}
