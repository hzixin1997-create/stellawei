import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ReminderAuditResult {
  totalBookings: number;
  paidBookings: number;
  reminderIssues: Array<{
    bookingId: string;
    issue: string;
    details: any;
    severity: 'critical' | 'warning' | 'info';
  }>;
  stats: {
    userReminderSent: number;
    userReminderNotSent: number;
    masterReminderSent: number;
    masterReminderNotSent: number;
    reminderProcessing: number;
    reminderError: number;
    retryCount: number;
  };
}

async function auditReminderSystem(): Promise<ReminderAuditResult> {
  const result: ReminderAuditResult = {
    totalBookings: 0,
    paidBookings: 0,
    reminderIssues: [],
    stats: {
      userReminderSent: 0,
      userReminderNotSent: 0,
      masterReminderSent: 0,
      masterReminderNotSent: 0,
      reminderProcessing: 0,
      reminderError: 0,
      retryCount: 0,
    },
  };

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, status, payment_status, scheduled_at, scheduled_date, scheduled_time, user_reminder_sent, master_reminder_sent, reminder_processing, reminder_error, reminder_retry_count, user_reminder_sent_at, master_reminder_sent_at, last_reminder_attempt_at, consultation_type')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch bookings:', error);
    throw error;
  }

  result.totalBookings = bookings?.length || 0;
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;

  for (const booking of bookings || []) {
    // 只检查已付款的实时咨询
    if (booking.payment_status !== 'paid' || booking.consultation_type !== 'realtime') {
      continue;
    }

    result.paidBookings++;

    // 统计
    if (booking.user_reminder_sent) result.stats.userReminderSent++;
    else result.stats.userReminderNotSent++;
    if (booking.master_reminder_sent) result.stats.masterReminderSent++;
    else result.stats.masterReminderNotSent++;
    if (booking.reminder_processing) result.stats.reminderProcessing++;
    if (booking.reminder_error) result.stats.reminderError++;
    if (booking.reminder_retry_count && booking.reminder_retry_count > 0) {
      result.stats.retryCount += booking.reminder_retry_count;
    }

    // 检查1: reminder_processing 长期为 true（超过10分钟，可能死锁）
    if (booking.reminder_processing) {
      const processingAt = booking.last_reminder_attempt_at;
      if (processingAt) {
        const processingTime = new Date(processingAt).getTime();
        if (now - processingTime > 10 * 60 * 1000) {
          result.reminderIssues.push({
            bookingId: booking.id,
            issue: 'reminder_processing 超过10分钟未释放，可能死锁',
            details: { processingAt, now: new Date(now).toISOString() },
            severity: 'critical',
          });
        }
      }
    }

    // 检查2: reminder_error 存在但 retry_count 超过3次（应停止重试）
    if (booking.reminder_error && (booking.reminder_retry_count || 0) > 3) {
      result.reminderIssues.push({
        bookingId: booking.id,
        issue: `reminder_error 存在且 retry_count=${booking.reminder_retry_count} > 3，应停止重试`,
        details: { error: booking.reminder_error, retryCount: booking.reminder_retry_count },
        severity: 'warning',
      });
    }

    // 检查3: 已发送提醒但 scheduled_at 在未来（不应该提前发送）
    if (booking.scheduled_at && (booking.user_reminder_sent || booking.master_reminder_sent)) {
      const scheduledTime = new Date(booking.scheduled_at).getTime();
      if (scheduledTime - now > fifteenMinutes * 2) {
        result.reminderIssues.push({
          bookingId: booking.id,
          issue: '提醒已发送但咨询时间在未来超过30分钟，可能提前发送',
          details: {
            scheduledAt: booking.scheduled_at,
            userReminderSent: booking.user_reminder_sent,
            masterReminderSent: booking.master_reminder_sent,
            userReminderSentAt: booking.user_reminder_sent_at,
            masterReminderSentAt: booking.master_reminder_sent_at,
          },
          severity: 'warning',
        });
      }
    }

    // 检查4: confirmed 状态且 scheduled_at 在15分钟内，但提醒未发送（可能漏发）
    if (booking.status === 'confirmed' && booking.scheduled_at) {
      const scheduledTime = new Date(booking.scheduled_at).getTime();
      const timeUntilStart = scheduledTime - now;
      // 如果距离开始还有 0-15分钟，且提醒未发送
      if (timeUntilStart > 0 && timeUntilStart <= fifteenMinutes) {
        if (!booking.user_reminder_sent || !booking.master_reminder_sent) {
          result.reminderIssues.push({
            bookingId: booking.id,
            issue: '距离咨询开始不足15分钟，但提醒未发送（可能漏发）',
            details: {
              scheduledAt: booking.scheduled_at,
              timeUntilStart: Math.round(timeUntilStart / 1000) + 's',
              userReminderSent: booking.user_reminder_sent,
              masterReminderSent: booking.master_reminder_sent,
            },
            severity: 'warning',
          });
        }
      }
    }

    // 检查5: in_progress 或 ended 状态但 reminder 未发送（严重漏发）
    if (['in_progress', 'ended', 'completed'].includes(booking.status)) {
      if (!booking.user_reminder_sent || !booking.master_reminder_sent) {
        result.reminderIssues.push({
          bookingId: booking.id,
          issue: `status=${booking.status} 但提醒未完全发送（user=${booking.user_reminder_sent}, master=${booking.master_reminder_sent}）`,
          details: { status: booking.status, userReminderSent: booking.user_reminder_sent, masterReminderSent: booking.master_reminder_sent },
          severity: booking.status === 'completed' ? 'info' : 'warning',
        });
      }
    }
  }

  return result;
}

async function main() {
  console.log('🔍 Reminder System 审计开始...\n');
  const result = await auditReminderSystem();

  console.log(`📊 总订单数: ${result.totalBookings}`);
  console.log(`💰 已付款实时咨询: ${result.paidBookings}`);

  console.log('\n📋 提醒统计:');
  console.log(`  用户提醒已发送: ${result.stats.userReminderSent}`);
  console.log(`  用户提醒未发送: ${result.stats.userReminderNotSent}`);
  console.log(`  师傅提醒已发送: ${result.stats.masterReminderSent}`);
  console.log(`  师傅提醒未发送: ${result.stats.masterReminderNotSent}`);
  console.log(`  正在处理中: ${result.stats.reminderProcessing}`);
  console.log(`  有错误记录: ${result.stats.reminderError}`);
  console.log(`  总重试次数: ${result.stats.retryCount}`);

  const critical = result.reminderIssues.filter(i => i.severity === 'critical');
  const warning = result.reminderIssues.filter(i => i.severity === 'warning');
  const info = result.reminderIssues.filter(i => i.severity === 'info');

  console.log(`\n🚨 Critical: ${critical.length}`);
  console.log(`⚠️  Warning: ${warning.length}`);
  console.log(`ℹ️  Info: ${info.length}`);

  if (critical.length > 0) {
    console.log('\n--- Critical Issues ---');
    for (const issue of critical) {
      console.log(`\n[${issue.bookingId}] ${issue.issue}`);
      console.log('  Details:', JSON.stringify(issue.details, null, 2));
    }
  }

  if (warning.length > 0) {
    console.log('\n--- Warning Issues ---');
    for (const issue of warning) {
      console.log(`\n[${issue.bookingId}] ${issue.issue}`);
      console.log('  Details:', JSON.stringify(issue.details, null, 2));
    }
  }

  if (info.length > 0) {
    console.log('\n--- Info ---');
    for (const issue of info) {
      console.log(`\n[${issue.bookingId}] ${issue.issue}`);
    }
  }

  console.log('\n✅ Reminder System 审计完成');
}

main().catch(console.error);
