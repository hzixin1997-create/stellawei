import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { TimeEngine } from '@/lib/timeEngine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/diagnostics/booking/:id
 * 单订单诊断（调试筛选问题）
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createServiceClient();

    // 尝试通过 id 查询，如果不存在则通过 order_number 查询
    let booking = null;
    let fetchError = null;

    const { data: byId, error: idError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (idError || !byId) {
      const { data: byOrderNum, error: orderError } = await supabase
        .from('bookings')
        .select('*')
        .eq('order_number', id)
        .single();
      booking = byOrderNum;
      fetchError = orderError;
    } else {
      booking = byId;
    }

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const sessionState = TimeEngine.getSessionState(booking, Date.now());

    // 模拟师傅后台的筛选判断
    const isPendingAccept = booking.payment_status === 'paid' && sessionState === 'pending';
    const isProcessing = booking.payment_status === 'paid' && (sessionState === 'confirmed' || sessionState === 'in_progress');
    const isCompleted = sessionState === 'completed';
    const isMessage = booking.consultation_type === 'message';

    return NextResponse.json({
      booking: {
        id: booking.id,
        status: booking.status,
        payment_status: booking.payment_status,
        scheduled_at: booking.scheduled_at,
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
        timezone: booking.timezone,
        duration_minutes: booking.duration_minutes,
        expires_at: booking.expires_at,
        consultation_type: booking.consultation_type,
      },
      computed: {
        sessionState,
        now: new Date().toISOString(),
        nowLocal: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      },
      filterMatches: {
        all: true,
        pending: isPendingAccept,
        processing: isProcessing,
        completed: isCompleted,
        message: isMessage,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
