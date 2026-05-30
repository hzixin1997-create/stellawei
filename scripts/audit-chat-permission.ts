import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ChatPermissionAuditResult {
  totalBookings: number;
  issues: Array<{
    bookingId: string;
    issue: string;
    details: any;
    severity: 'critical' | 'warning' | 'info';
  }>;
}

async function auditChatPermission(): Promise<ChatPermissionAuditResult> {
  const result: ChatPermissionAuditResult = {
    totalBookings: 0,
    issues: [],
  };

  // 获取所有实时咨询订单
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, status, payment_status, scheduled_at, duration_minutes, user_id, master_id, consultation_type')
    .eq('consultation_type', 'realtime')
    .in('status', ['pending', 'confirmed', 'upcoming', 'in_progress', 'ended', 'completed'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch bookings:', error);
    throw error;
  }

  result.totalBookings = bookings?.length || 0;

  for (const booking of bookings || []) {
    // 获取该订单的消息数
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, sender_type, created_at')
      .eq('booking_id', booking.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      result.issues.push({
        bookingId: booking.id,
        issue: '查询消息失败',
        details: { error: msgError.message },
        severity: 'warning',
      });
      continue;
    }

    const userMessages = messages?.filter(m => m.sender_type === 'user') || [];
    const masterMessages = messages?.filter(m => m.sender_type === 'master') || [];
    const totalMessages = messages?.length || 0;

    // 检查1: pending/confirmed/upcoming 阶段，用户消息超过5条（可能绕过限制）
    if (['pending', 'confirmed', 'upcoming'].includes(booking.status)) {
      if (userMessages.length > 5) {
        result.issues.push({
          bookingId: booking.id,
          issue: `status=${booking.status} 但用户已发送 ${userMessages.length} 条消息（应限制5条）`,
          details: { status: booking.status, userMessageCount: userMessages.length, totalMessages },
          severity: 'warning',
        });
      }
    }

    // 检查2: ended 阶段，用户发送了新消息（应该只读）
    if (booking.status === 'ended') {
      const lastUserMsg = userMessages[userMessages.length - 1];
      if (lastUserMsg) {
        // 检查是否 ended 后还有用户消息（需要 scheduled_at 来判断）
        if (booking.scheduled_at && booking.duration_minutes) {
          const scheduledTime = new Date(booking.scheduled_at).getTime();
          const endTime = scheduledTime + booking.duration_minutes * 60 * 1000;
          const endedAfter = userMessages.filter(m => new Date(m.created_at).getTime() > endTime);
          if (endedAfter.length > 0) {
            result.issues.push({
              bookingId: booking.id,
              issue: `ended 状态但用户在咨询结束后发送了 ${endedAfter.length} 条消息`,
              details: { status: booking.status, endedAfterCount: endedAfter.length },
              severity: 'warning',
            });
          }
        }
      }
    }

    // 检查3: completed 阶段，任何新消息（应该完全锁定）
    if (booking.status === 'completed') {
      const lastMsg = messages?.[messages.length - 1];
      if (lastMsg) {
        // 如果 completed 后还有消息（需要 updated_at 来判断）
        const { data: bookingUpdated } = await supabase
          .from('bookings')
          .select('updated_at')
          .eq('id', booking.id)
          .single();
        if (bookingUpdated?.updated_at) {
          const completedTime = new Date(bookingUpdated.updated_at).getTime();
          const afterCompleted = messages.filter(m => new Date(m.created_at).getTime() > completedTime);
          if (afterCompleted.length > 0) {
            result.issues.push({
              bookingId: booking.id,
              issue: `completed 状态但 completed 后仍有 ${afterCompleted.length} 条新消息`,
              details: { status: booking.status, afterCompletedCount: afterCompleted.length },
              severity: 'critical',
            });
          }
        }
      }
    }

    // 检查4: in_progress 阶段，没有消息（可能聊天功能异常）
    if (booking.status === 'in_progress' && totalMessages === 0) {
      result.issues.push({
        bookingId: booking.id,
        issue: 'in_progress 状态但聊天记录为空（可能未开始聊天）',
        details: { status: booking.status, totalMessages },
        severity: 'info',
      });
    }
  }

  return result;
}

async function main() {
  console.log('🔍 Chat Permission 审计开始...\n');
  const result = await auditChatPermission();

  console.log(`📊 实时咨询订单数: ${result.totalBookings}`);

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

  if (info.length > 0) {
    console.log('\n--- Info ---');
    for (const issue of info) {
      console.log(`\n[${issue.bookingId}] ${issue.issue}`);
    }
  }

  console.log('\n✅ Chat Permission 审计完成');
}

main().catch(console.error);
