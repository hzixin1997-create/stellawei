import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/send-pending-emails
 * 定时扫描并发送待处理的邮件（referral_invitation 等）
 * 每小时执行一次
 */
export async function GET(request: Request) {
  return doSend(null);
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = authHeader ? authHeader.replace('Bearer ', '') : null;
  return doSend(secret);
}

async function doSend(secret: string | null) {
  try {
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && secret && secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // 查询所有待发送且已到达发送时间的邮件
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_logs')
      .select('id, user_id, template_type, language, metadata')
      .eq('status', 'pending')
      .lte('send_after', now);

    if (fetchError) {
      console.error('[cron] fetch pending emails error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch pending emails', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'No pending emails' });
    }

    const results = [];

    for (const email of pendingEmails) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stellawei.org';

        if (email.template_type === 'referral_invitation') {
          // 调用 referral/invite API 发送邮件
          const response = await fetch(`${appUrl}/api/referral/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: email.user_id }),
          });

          if (response.ok) {
            // 更新状态为 sent
            await supabase
              .from('email_logs')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', email.id);
            results.push({ id: email.id, status: 'sent' });
          } else {
            const errorData = await response.json().catch(() => ({}));
            await supabase
              .from('email_logs')
              .update({ status: 'failed', metadata: { ...email.metadata, error: errorData.error || 'API call failed' } })
              .eq('id', email.id);
            results.push({ id: email.id, status: 'failed', error: errorData.error });
          }
        }
      } catch (err: any) {
        console.error(`[cron] failed to send email ${email.id}:`, err);
        await supabase
          .from('email_logs')
          .update({ status: 'failed', metadata: { ...email.metadata, error: err.message } })
          .eq('id', email.id);
        results.push({ id: email.id, status: 'failed', error: err.message });
      }
    }

    const sentCount = results.filter((r) => r.status === 'sent').length;
    const failedCount = results.filter((r) => r.status === 'failed').length;

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: pendingEmails.length,
      results,
    });
  } catch (error: any) {
    console.error('[cron] send pending emails error:', error);
    return NextResponse.json(
      { error: 'Internal error', message: error.message },
      { status: 500 }
    );
  }
}
