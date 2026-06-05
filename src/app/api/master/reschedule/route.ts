import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { rescheduleBooking } from '@/lib/reschedule';
import { getLang, getMessage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * POST /api/master/reschedule
 * 师傅修改已确认/进行中的实时咨询订单时间
 * Body: { bookingId, scheduled_date, scheduled_time }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, scheduled_date, scheduled_time } = body;

    if (!bookingId || !scheduled_date || !scheduled_time) {
      return NextResponse.json(
        { error: getMessage('INTERNAL_ERROR', request) },
        { status: 400 }
      );
    }

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: getMessage('UNAUTHORIZED', request) },
        { status: 401 }
      );
    }

    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    // 获取 master 的 Supabase UUID
    const supabaseService = await createClient();
    const { data: masterRecord } = await supabaseService
      .from('masters')
      .select('id')
      .eq('slug', masterInfo.slug)
      .single();
    const masterId = masterRecord?.id || masterInfo.slug;

    // 调用统一 reschedule 函数
    const result = await rescheduleBooking({
      bookingId,
      scheduledDate: scheduled_date,
      scheduledTime: scheduled_time,
      requestingUserId: masterId,
      requestingUserEmail: user.email || undefined,
      isMaster: true,
      lang: getLang(request),
    });

    if (!result.success) {
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
    console.error('Master reschedule API error:', error);
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}
