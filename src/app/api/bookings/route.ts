import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // ===== 待支付订单检查 =====
    // 每个用户同时只能有一个待支付订单，防止占用多个时间槽
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
          error: 'You already have a pending order',
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
          { error: 'First-time discount is only available for your first order' },
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
    };

    // 实时咨询需要时间信息
    if (body.consultation_type === 'realtime') {
      if (body.scheduled_at) bookingData.scheduled_at = body.scheduled_at;
      if (body.scheduled_date) bookingData.scheduled_date = body.scheduled_date;
      if (body.scheduled_time) bookingData.scheduled_time = body.scheduled_time;
      if (body.expires_at) bookingData.expires_at = body.expires_at;
    }

    // 留言咨询设置过期时间
    if (body.consultation_type === 'message') {
      bookingData.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    // 插入 bookings 表
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error('Create booking error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create booking', message: bookingError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    console.error('Create booking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
