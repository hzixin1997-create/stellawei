import sgMail from '@sendgrid/mail';

// SendGrid 配置（延迟初始化）
let sgInitialized = false;

function getSendGrid() {
  if (!sgInitialized) {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return null;
    }
    sgMail.setApiKey(apiKey);
    sgInitialized = true;
  }
  return sgMail;
}

interface SendEmailLog {
  provider: 'sendgrid' | 'resend';
  to: string;
  subject: string;
  status: 'success' | 'error';
  statusCode?: number;
  response?: string;
  error?: string;
  timestamp: string;
  durationMs: number;
}

const emailLogs: SendEmailLog[] = [];

export function getEmailLogs(): SendEmailLog[] {
  return [...emailLogs];
}

function addLog(log: SendEmailLog) {
  emailLogs.push(log);
  // 只保留最近50条日志，防止内存泄漏
  if (emailLogs.length > 50) {
    emailLogs.shift();
  }
  console.log(`[email] ${log.provider} ${log.status} → ${log.to} | ${log.subject} | ${log.statusCode || log.error || ''}`);
}

// SendGrid 发送邮件
export async function sendEmailViaSendGrid({
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
  const start = Date.now();
  const client = getSendGrid();

  if (!client) {
    const log: SendEmailLog = {
      provider: 'sendgrid',
      to,
      subject,
      status: 'error',
      error: 'SENDGRID_API_KEY not configured',
      timestamp: new Date().toISOString(),
      durationMs: 0,
    };
    addLog(log);
    return { success: false, error: 'SENDGRID_API_KEY not configured' };
  }

  try {
    const msg = {
      to,
      from,
      subject,
      html,
    };

    const [response] = await client.send(msg);
    const statusCode = response?.statusCode || 202;

    const log: SendEmailLog = {
      provider: 'sendgrid',
      to,
      subject,
      status: 'success',
      statusCode,
      response: `statusCode=${statusCode}`,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
    addLog(log);

    return { success: true, statusCode, id: response?.headers?.['x-message-id'] || '' };
  } catch (err: any) {
    const statusCode = err?.code || err?.statusCode || 0;
    const errorMessage = err?.response?.body?.errors?.[0]?.message || err?.message || 'Unknown SendGrid error';

    const log: SendEmailLog = {
      provider: 'sendgrid',
      to,
      subject,
      status: 'error',
      statusCode,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
    addLog(log);

    return { success: false, error: errorMessage, statusCode };
  }
}
