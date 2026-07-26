import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { getMessage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * POST /api/master/complete-message
 * 师傅手动标记留言咨询为完成
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookingId' },
        { status: 400 }
      );
    }

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 验证 booking 属于当前师傅且是留言咨询
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, master_id, status, consultation_type, user_id, service_id, total_amount, currency, order_number')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: getMessage('BOOKING_NOT_FOUND', request) }, { status: 404 });
    }

    if (booking.master_id !== masterInfo.slug) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    if (booking.consultation_type !== 'message') {
      return NextResponse.json({ error: 'Only message consultations can be completed this way' }, { status: 400 });
    }

    // 更新订单状态为已完成
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Complete message booking error:', updateError);
      return NextResponse.json({ error: 'Failed to complete booking', message: updateError.message }, { status: 500 });
    }

    // 发送飞书通知（异步，不阻塞响应）
    sendFeishuCompletionNotification(booking, supabase).catch(err => {
      console.error('[CompleteMessage] Feishu notification failed:', err);
    });

    return NextResponse.json({ success: true, status: 'completed' });
  } catch (error: any) {
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}

// 发送飞书订单完成通知
async function sendFeishuCompletionNotification(booking: any, supabase: any) {
  const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL;
  if (!FEISHU_WEBHOOK) {
    console.warn('[CompleteMessage] FEISHU_WEBHOOK_URL not configured');
    return;
  }

  try {
    // 获取师傅信息
    const { data: master } = await supabase
      .from('masters')
      .select('display_name, email')
      .eq('slug', booking.master_id)
      .single();

    // 获取用户信息
    const { data: user } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', booking.user_id)
      .single();

    const orderNumber = booking.order_number || booking.id.slice(0, 8);
    const masterName = master?.display_name || booking.master_id;
    const userName = user?.full_name || user?.email || 'Unknown';
    const serviceName = booking.service_id || 'Consultation';
    const amount = booking.total_amount || 0;
    const chatUrl = `https://stellawei.org/chat/${booking.id}`;

    const content = `✅ 留言咨询已完成

订单号：${orderNumber}
师傅：${masterName}
用户：${userName}
服务：${serviceName}
金额：$${amount.toFixed(2)}

查看详情：${chatUrl}`;

    await fetch(FEISHU_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: content },
      }),
    });

    console.log('[CompleteMessage] Feishu completion notification sent for booking:', booking.id);
  } catch (err) {
    console.error('[CompleteMessage] Failed to send Feishu completion notification:', err);
  }
}
