import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { TimeEngine } from '@/lib/timeEngine';
import { getMessage, getLang } from '@/lib/i18n';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings
 * 创建新的 booking 订单（绕过 RLS）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 鉴权：获取当前用户
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    const supabase = createServiceClient();

    // ===== 实时咨询：时间槽冲突检查（二次校验，防止竞态）=====
    if (body.consultation_type === 'realtime' && body.scheduled_date && body.scheduled_time) {
      // 先检查：当前用户是否有旧的 pending 订单占用了同一时间槽
      // 如果有，自动取消旧订单，允许用户重新预约（支付失败后释放时间槽）
      const { data: userOldPending } = await supabase
        .from('bookings')
        .select('id, status, payment_status, expires_at')
        .eq('user_id', user.id)
        .eq('master_id', body.master_id)
        .eq('scheduled_date', body.scheduled_date)
        .eq('scheduled_time', body.scheduled_time)
        .eq('status', 'pending')
        .eq('payment_status', 'pending');

      for (const oldOrder of (userOldPending || [])) {
        await supabase
          .from('bookings')
          .update({
            status: 'cancelled',
            payment_status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', oldOrder.id);
      }

      // 再检查其他用户是否占用了这个时间槽
      const { data: conflictBookings, error: conflictError } = await supabase
        .from('bookings')
        .select('id, status, created_at, expires_at')
        .eq('master_id', body.master_id)
        .eq('scheduled_date', body.scheduled_date)
        .eq('scheduled_time', body.scheduled_time)
        .in('status', ['pending', 'paid', 'confirmed', 'in_progress']);

      if (conflictError) {
        return NextResponse.json(
          { error: getMessage('CHECK_SLOT_FAILED', request) },
          { status: 500 }
        );
      }

      const now = Date.now();
      const occupied = (conflictBookings || []).filter((b: any) => {
        if (['paid', 'confirmed', 'in_progress'].includes(b.status)) return true;
        if (b.status === 'pending') {
          if (!b.expires_at) return true;
          return new Date(b.expires_at).getTime() > now;
        }
        return false;
      });

      if (occupied.length > 0) {
        return NextResponse.json(
          { error: getMessage('SLOT_BOOKED', request) },
          { status: 409 }
        );
      }
    }

    // ===== 待支付订单检查 =====
    // 每个用户同时只能有一个待支付订单，防止占用多个时间槽
    // 但如果用户重新预约同一时间槽，上面已经自动取消了旧订单，这里不会拦截
    const now = new Date().toISOString();
    const { data: pendingOrders } = await supabase
      .from('bookings')
      .select('id, scheduled_date, scheduled_time, master_id')
      .eq('user_id', user.id)
      .eq('payment_status', 'pending')
      .eq('status', 'pending')
      .gt('expires_at', now)
      .limit(1);

    if (pendingOrders && pendingOrders.length > 0) {
      const p = pendingOrders[0];
      return NextResponse.json(
        {
          error: getMessage('PENDING_ORDER', request),
          message: `You have an unpaid order scheduled for ${p.scheduled_date} ${p.scheduled_time}. Please complete payment or wait for it to expire before creating a new order.`,
          existingOrderId: p.id,
        },
        { status: 400 }
      );
    }

    // ===== 首单优惠校验 =====
    // first 档位仅限真正的新用户：从未成功付款过的用户
    // 未支付/已过期的订单不算占用首单资格
    if (body.tier === 'first' || body.tier === 'first_time') {
      const { data: paidOrders } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', user.id)
        .eq('payment_status', 'paid')
        .limit(1);

      if (paidOrders && paidOrders.length > 0) {
        return NextResponse.json(
          { error: getMessage('FIRST_TIME_ONLY', request) },
          { status: 400 }
        );
      }
    }

    // ===== 2小时预约缓冲校验 =====
    // 实时咨询必须至少提前2小时预约
    if (body.consultation_type === 'realtime' && body.scheduled_at) {
      if (!TimeEngine.canBook(body.scheduled_at)) {
        return NextResponse.json(
          { error: 'Real-time consultations must be booked at least 15 minutes in advance' },
          { status: 400 }
        );
      }
      if (!TimeEngine.canReschedule(body.scheduled_at)) {
        return NextResponse.json(
          { error: getMessage('BOOK_TOO_SHORT', request) },
          { status: 400 }
        );
      }
    }

    // 构建 booking 数据
    const bookingData: any = {
      user_id: user.id,
      master_id: body.master_id,
      service_id: body.service_id,
      service_category: body.service_category,
      consultation_type: body.consultation_type,
      tier: body.tier,
      status: 'pending',
      payment_status: 'pending',
      subtotal: body.subtotal,
      discount_amount: body.discount_amount || 0,
      total_amount: body.total_amount,
      currency: body.currency || 'usd',
      timezone: body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      is_first_time: body.is_first_time || false,
      duration_text: body.duration_text,
      duration_minutes: body.duration_minutes || 25,
      question_text: body.question_text || null,
      question_images: body.question_images || null,
    };

    // 实时咨询需要时间信息
    if (body.consultation_type === 'realtime') {
      if (body.scheduled_at) bookingData.scheduled_at = body.scheduled_at;
      if (body.scheduled_date) bookingData.scheduled_date = body.scheduled_date;
      if (body.scheduled_time) bookingData.scheduled_time = body.scheduled_time;
      if (body.expires_at) bookingData.expires_at = body.expires_at;
    }

    // 留言咨询设置过期时间（10分钟支付期限）
    if (body.consultation_type === 'message') {
      bookingData.expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    }

    // 实时咨询设置过期时间（10分钟支付期限）
    if (body.consultation_type === 'realtime') {
      bookingData.expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    }

    // 插入 bookings 表（二次时间槽校验已通过）
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error('Create booking error:', bookingError);
      return NextResponse.json(
        { error: getMessage('CREATE_FAILED', request), message: bookingError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error('Create booking API error:', error);
    Sentry.captureException(error, {
      tags: { api: 'bookings', method: 'POST', component: 'booking' },
    });
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}
