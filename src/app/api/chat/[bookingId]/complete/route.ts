import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { getMessage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat/[bookingId]/complete
 * 结束咨询，标记订单为 completed
 */
export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const { bookingId } = params;

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证 booking 存在
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: getMessage('BOOKING_NOT_FOUND', request) }, { status: 404 });
    }

    // 检查权限
    const masterInfo = getMasterByEmail(user.email || '');
    const isUser = booking.user_id === user.id;
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;

    if (!isUser && !isMaster) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_USER', request) }, { status: 403 });
    }

    // 检查订单状态（confirmed 或 in_progress 均可标记为 completed）
    if (booking.status !== 'in_progress' && booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: getMessage('CONSULTATION_ENDED', request), currentStatus: booking.status },
        { status: 400 }
      );
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: getMessage('UNPAID_BOOKING', request) }, { status: 400 });
    }

    // 更新订单状态为 completed
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('Complete booking error:', updateError);
      return NextResponse.json(
        { error: getMessage('COMPLETE_FAILED', request), message: updateError.message },
        { status: 500 }
      );
    }

    // 触发推荐奖励（异步，不阻塞响应）
    try {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://stellawei.org'}/api/referral/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, userId: booking.user_id }),
      }).catch(err => console.error('Referral reward trigger failed:', err));
    } catch (err) {
      console.error('Failed to trigger referral reward:', err);
    }

    // 发送推荐邀请邮件（24小时后）
    try {
      // 检查是否已发送过邀请
      const { data: existingInvite } = await supabase
        .from('email_logs')
        .select('id')
        .eq('user_id', booking.user_id)
        .eq('template_type', 'referral_invitation')
        .single();

      if (!existingInvite) {
        // 插入 pending 记录，由 cron 定时发送（24小时后）
        await supabase.from('email_logs').insert({
          user_id: booking.user_id,
          template_type: 'referral_invitation',
          status: 'pending',
          send_after: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          metadata: { booking_id: bookingId },
        });
      }
    } catch (err) {
      console.error('Failed to schedule referral invite:', err);
    }

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Complete chat API error:', error);
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}
