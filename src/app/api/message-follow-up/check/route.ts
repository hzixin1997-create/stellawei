import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

const MASTER_EMAIL_MAP: Record<string, { display_name: string; email: string }> = {
  'master-luna': { display_name: 'Master Luna', email: 'lunalintarot@163.com' },
  'zhang-yihua': { display_name: 'Master Zhang Yihua', email: 'qimenyihua@gmail.com' },
  'wu-yang': { display_name: 'Master Wu Yang', email: 'mshoucangjia@gmail.com' },
};

/**
 * GET/POST /api/message-follow-up/check
 * 检查留言咨询订单状态，发送飞书通知
 * 1. 创建20-21小时，师傅未回复 → 催促师傅
 * 2. 师傅回复4-5小时后，用户未跟进 → 提醒用户流失
 * 由 Vercel cron 每15分钟调用一次
 */
export async function GET(request: Request) {
  return doCheck();
}

export async function POST(request: Request) {
  const cronSecret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret && cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return doCheck();
}

async function doCheck() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date();
    const twentyOneHoursAgo = new Date(now.getTime() - 21 * 60 * 60 * 1000).toISOString();
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString();

    const results: any[] = [];

    // === 场景 1: 创建20-21小时，师傅未回复 ===
    const { data: unReplied, error: unRepliedError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        master_id,
        service_id,
        created_at,
        order_number
      `)
      .eq('consultation_type', 'message')
      .eq('status', 'confirmed')
      .gte('created_at', twentyOneHoursAgo)
      .lt('created_at', twentyHoursAgo);

    if (unRepliedError) {
      console.error('[message-follow-up] Unreplied query error:', unRepliedError);
    }

    for (const booking of unReplied || []) {
      // 检查师傅是否真的没有回复
      const { data: masterMessages, error: msgError } = await supabase
        .from('messages')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('sender_type', 'master')
        .limit(1);

      if (msgError) continue;
      // 师傅已回复，跳过
      if (masterMessages && masterMessages.length > 0) continue;

      // 获取用户信息
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', booking.user_id)
        .single();

      // 获取师傅信息
      let masterName = booking.master_id;
      const { data: dbMaster } = await supabase
        .from('masters')
        .select('display_name')
        .eq('slug', booking.master_id)
        .single();
      if (dbMaster) masterName = dbMaster.display_name;
      else if (MASTER_EMAIL_MAP[booking.master_id]) masterName = MASTER_EMAIL_MAP[booking.master_id].display_name;

      // 发送飞书通知
      await sendFeishuFollowUp({
        type: 'MASTER_NO_REPLY',
        booking,
        userName: userProfile?.full_name || 'Unknown',
        masterName,
      });

      results.push({
        bookingId: booking.id,
        type: 'MASTER_NO_REPLY',
        masterName,
        notified: true,
      });
    }

    // === 场景 2: 师傅回复4-5小时后，用户未跟进 ===
    // 先查询所有师傅已回复的留言咨询
    const { data: repliedBookings, error: repliedError } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        master_id,
        service_id,
        created_at,
        order_number
      `)
      .eq('consultation_type', 'message')
      .eq('status', 'confirmed')
      .lt('created_at', twentyHoursAgo);

    if (repliedError) {
      console.error('[message-follow-up] Replied query error:', repliedError);
    }

    for (const booking of repliedBookings || []) {
      // 获取师傅最新的回复
      const { data: latestMasterReply } = await supabase
        .from('messages')
        .select('created_at')
        .eq('booking_id', booking.id)
        .eq('sender_type', 'master')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!latestMasterReply) continue;

      // 师傅回复是否在 4-5 小时前
      const replyTime = new Date(latestMasterReply.created_at).getTime();
      if (replyTime < new Date(fiveHoursAgo).getTime() || replyTime >= new Date(fourHoursAgo).getTime()) {
        continue;
      }

      // 检查用户是否在师傅回复后发送了 follow-up
      const { data: userFollowUp } = await supabase
        .from('messages')
        .select('id')
        .eq('booking_id', booking.id)
        .eq('sender_type', 'user')
        .gt('created_at', latestMasterReply.created_at)
        .limit(1);

      // 用户已跟进，跳过
      if (userFollowUp && userFollowUp.length > 0) continue;

      // 获取用户信息
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', booking.user_id)
        .single();

      // 获取师傅信息
      let masterName = booking.master_id;
      const { data: dbMaster } = await supabase
        .from('masters')
        .select('display_name')
        .eq('slug', booking.master_id)
        .single();
      if (dbMaster) masterName = dbMaster.display_name;
      else if (MASTER_EMAIL_MAP[booking.master_id]) masterName = MASTER_EMAIL_MAP[booking.master_id].display_name;

      // 发送飞书通知
      await sendFeishuFollowUp({
        type: 'USER_NO_FOLLOWUP',
        booking,
        userName: userProfile?.full_name || 'Unknown',
        masterName,
        replyTime: latestMasterReply.created_at,
      });

      results.push({
        bookingId: booking.id,
        type: 'USER_NO_FOLLOWUP',
        masterName,
        notified: true,
      });
    }

    return NextResponse.json({
      success: true,
      checked: (unReplied?.length || 0) + (repliedBookings?.length || 0),
      notified: results.length,
      results,
    });
  } catch (error: any) {
    console.error('[message-follow-up] Error:', error);
    Sentry.captureException(error, {
      tags: { api: 'message-follow-up', component: 'cron' },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function sendFeishuFollowUp({
  type,
  booking,
  userName,
  masterName,
  replyTime,
}: {
  type: 'MASTER_NO_REPLY' | 'USER_NO_FOLLOWUP';
  booking: any;
  userName: string;
  masterName: string;
  replyTime?: string;
}) {
  const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK_URL;
  if (!FEISHU_WEBHOOK) {
    console.warn('[message-follow-up] FEISHU_WEBHOOK_URL not configured');
    return;
  }

  const orderNumber = booking.order_number || booking.id.slice(0, 8);
  const chatUrl = `https://stellawei.org/chat/${booking.id}`;
  const masterDashboard = `https://stellawei.org/master/dashboard`;

  let content = '';

  if (type === 'MASTER_NO_REPLY') {
    content = `⚠️ 留言咨询待回复提醒

订单号：${orderNumber}
师傅：${masterName}
用户：${userName}
服务：${booking.service_id || 'Message Consultation'}
创建时间：${new Date(booking.created_at).toLocaleString('zh-CN')}
状态：超过20小时未回复

请催促师傅尽快回复用户，避免用户流失。

师傅后台：${masterDashboard}
聊天页面：${chatUrl}`;
  } else {
    content = `⚠️ 用户可能流失提醒

订单号：${orderNumber}
师傅：${masterName}
用户：${userName}
服务：${booking.service_id || 'Message Consultation'}
师傅回复时间：${replyTime ? new Date(replyTime).toLocaleString('zh-CN') : '-'}
状态：师傅已回复超过4小时，用户未跟进

用户可能未看到回复或已流失，建议主动联系用户。

聊天页面：${chatUrl}`;
  }

  try {
    await fetch(FEISHU_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msg_type: 'text',
        content: { text: content },
      }),
    });
    console.log('[message-follow-up] Feishu notification sent:', type, booking.id);
  } catch (err) {
    console.error('[message-follow-up] Feishu send failed:', err);
  }
}
