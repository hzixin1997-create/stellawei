import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AuditResult {
  total: number;
  byStatus: Record<string, number>;
  issues: Array<{
    bookingId: string;
    issue: string;
    details: any;
    severity: 'critical' | 'warning' | 'info';
  }>;
}

async function auditSessionState(): Promise<AuditResult> {
  const result: AuditResult = {
    total: 0,
    byStatus: {},
    issues: [],
  };

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, status, payment_status, scheduled_at, scheduled_date, scheduled_time, duration_minutes, created_at, updated_at, consultation_type')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch bookings:', error);
    throw error;
  }

  result.total = bookings?.length || 0;
  const now = Date.now();

  for (const booking of bookings || []) {
    // 统计各状态数量
    result.byStatus[booking.status] = (result.byStatus[booking.status] || 0) + 1;

    // 检查1: scheduled_at 必须存在（实时咨询）
    if (booking.consultation_type === 'realtime' && !booking.scheduled_at) {
      result.issues.push({
        bookingId: booking.id,
        issue: '实时咨询缺少 scheduled_at',
        details: { status: booking.status, scheduled_date: booking.scheduled_date, scheduled_time: booking.scheduled_time },
        severity: 'critical',
      });
    }

    // 检查2: 如果 status 是 ended/completed，必须有 scheduled_at
    if (['ended', 'completed', 'in_progress'].includes(booking.status) && !booking.scheduled_at) {
      result.issues.push({
        bookingId: booking.id,
        issue: `${booking.status} 状态但缺少 scheduled_at`,
        details: { status: booking.status },
        severity: 'critical',
      });
    }

    // 检查3: ended 状态但已经过了 end_time + 5分钟，应该 completed
    if (booking.status === 'ended' && booking.scheduled_at && booking.duration_minutes) {
      const scheduledTime = new Date(booking.scheduled_at).getTime();
      const endTime = scheduledTime + booking.duration_minutes * 60 * 1000;
      const bufferEndTime = endTime + 5 * 60 * 1000;
      if (now > bufferEndTime) {
        result.issues.push({
          bookingId: booking.id,
          issue: 'ended 状态已超过 end_time + 5分钟，应自动 completed',
          details: {
            scheduledAt: booking.scheduled_at,
            duration: booking.duration_minutes,
            endTime: new Date(endTime).toISOString(),
            bufferEndTime: new Date(bufferEndTime).toISOString(),
            now: new Date(now).toISOString(),
          },
          severity: 'warning',
        });
      }
    }

    // 检查4: in_progress 状态但已经过了 end_time，应 ended
    if (booking.status === 'in_progress' && booking.scheduled_at && booking.duration_minutes) {
      const scheduledTime = new Date(booking.scheduled_at).getTime();
      const endTime = scheduledTime + booking.duration_minutes * 60 * 1000;
      if (now > endTime) {
        result.issues.push({
          bookingId: booking.id,
          issue: 'in_progress 状态已超过 end_time，应自动 ended',
          details: {
            scheduledAt: booking.scheduled_at,
            duration: booking.duration_minutes,
            endTime: new Date(endTime).toISOString(),
            now: new Date(now).toISOString(),
          },
          severity: 'warning',
        });
      }
    }

    // 检查5: upcoming 状态但已经过了 start_time，应 in_progress
    if (booking.status === 'upcoming' && booking.scheduled_at) {
      const scheduledTime = new Date(booking.scheduled_at).getTime();
      if (now > scheduledTime) {
        result.issues.push({
          bookingId: booking.id,
          issue: 'upcoming 状态已超过 start_time，应自动 in_progress',
          details: {
            scheduledAt: booking.scheduled_at,
            now: new Date(now).toISOString(),
          },
          severity: 'warning',
        });
      }
    }

    // 检查6: completed 状态但 scheduled_at 在未来（不合理）
    if (booking.status === 'completed' && booking.scheduled_at) {
      const scheduledTime = new Date(booking.scheduled_at).getTime();
      if (booking.duration_minutes) {
        const endTime = scheduledTime + booking.duration_minutes * 60 * 1000;
        if (now < endTime) {
          result.issues.push({
            bookingId: booking.id,
            issue: 'completed 状态但咨询尚未结束（时间在未来）',
            details: {
              scheduledAt: booking.scheduled_at,
              endTime: new Date(endTime).toISOString(),
              now: new Date(now).toISOString(),
            },
            severity: 'critical',
          });
        }
      }
    }

    // 检查7: pending 状态但 payment_status 是 paid（应该 confirmed/upcoming）
    if (booking.status === 'pending' && booking.payment_status === 'paid') {
      result.issues.push({
        bookingId: booking.id,
        issue: 'status=pending 但 payment_status=paid，状态不匹配',
        details: { status: booking.status, payment_status: booking.payment_status },
        severity: 'critical',
      });
    }

    // 检查8: confirmed 状态但 payment_status 不是 paid
    if (booking.status === 'confirmed' && booking.payment_status !== 'paid') {
      result.issues.push({
        bookingId: booking.id,
        issue: 'status=confirmed 但 payment_status 不是 paid',
        details: { status: booking.status, payment_status: booking.payment_status },
        severity: 'critical',
      });
    }
  }

  return result;
}

async function main() {
  console.log('🔍 Session State 审计开始...\n');
  const result = await auditSessionState();

  console.log(`📊 总订单数: ${result.total}`);
  console.log('\n📋 状态分布:');
  for (const [status, count] of Object.entries(result.byStatus)) {
    console.log(`  ${status}: ${count}`);
  }

  const critical = result.issues.filter(i => i.severity === 'critical');
  const warning = result.issues.filter(i => i.severity === 'warning');
  const info = result.issues.filter(i => i.severity === 'info');

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

  console.log('\n✅ Session State 审计完成');
}

main().catch(console.error);
