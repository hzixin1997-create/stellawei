/**
 * Brevo (原 Sendinblue) 邮件发送封装
 * 对国内邮箱（QQ/163/Gmail）送达率较好
 */

interface BrevoEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: { name: string; email: string };
}

function getBrevoApiKey(): string | null {
  return process.env.BREVO_API_KEY || null;
}

export async function sendEmailViaBrevo({
  to,
  subject,
  html,
  from = { name: 'Stellawei', email: 'noreply@stellawei.org' },
}: BrevoEmailParams): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = getBrevoApiKey();

  if (!apiKey) {
    return { success: false, error: 'BREVO_API_KEY not configured' };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[brevo] send error:', data);
      return { success: false, error: data.message || `HTTP ${res.status}` };
    }

    console.log('[brevo] success →', to, data.messageId);
    return { success: true, id: data.messageId };
  } catch (err: any) {
    console.error('[brevo] exception:', err);
    return { success: false, error: err.message };
  }
}
