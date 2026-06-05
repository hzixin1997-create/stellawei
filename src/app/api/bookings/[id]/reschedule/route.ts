import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rescheduleBooking } from '@/lib/reschedule';
import { getLang } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/[id]/reschedule
 * 用户修改已付款订单的预约时间（仅限未开始的实时咨询）
 * Body: { scheduled_date: "2026-05-24", scheduled_time: "14:00" }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { scheduled_date, scheduled_time } = body;

    if (!scheduled_date || !scheduled_time) {
      return NextResponse.json(
        { error: 'Missing scheduled_date or scheduled_time' },
        { status: 400 }
      );
    }

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 调用统一 reschedule 函数
    const result = await rescheduleBooking({
      bookingId: id,
      scheduledDate: scheduled_date,
      scheduledTime: scheduled_time,
      requestingUserId: user.id,
      isMaster: false,
      lang: getLang(request),
    });

    if (!result.success) {
      // 根据错误码映射 HTTP 状态码
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FORBIDDEN: 403,
        INVALID_TYPE: 400,
        INVALID_STATUS: 400,
        UNPAID: 400,
        PAST_TIME: 400,
        ENDED_TIME: 400,
        SLOT_UNAVAILABLE: 400,
        TIME_CONFLICT: 409,
        CONFLICT_CHECK_ERROR: 500,
        UPDATE_ERROR: 500,
      };
      return NextResponse.json(
        { error: result.error },
        { status: statusMap[result.code] || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: result.booking,
      message: 'Booking rescheduled successfully',
    });
  } catch (error: any) {
    console.error('Reschedule API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
