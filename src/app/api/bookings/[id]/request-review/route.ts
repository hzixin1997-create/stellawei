import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/[id]/request-review
 * 师傅邀请用户评价
 * - 权限：只有该订单的师傅本人能调用
 * - 校验：订单状态必须为 completed
 * - 操作：设置 bookings.review_requested = true
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 鉴权：获取当前用户
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证 booking 存在
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, review_requested, review_data')
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 权限校验：只有该订单的师傅本人能调用
    const masterInfo = getMasterByEmail(user.email || '');
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;

    if (!isMaster) {
      return NextResponse.json(
        { error: 'Forbidden - only the assigned master can request review' },
        { status: 403 }
      );
    }

    // 订单状态校验：已完成、进行中、已接单的订单才能邀请评价
    if (!['completed', 'in_progress', 'confirmed'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Booking must be completed or in progress before requesting review', currentStatus: booking.status },
        { status: 400 }
      );
    }

    // 更新 review_requested = true（触发 Realtime 通知用户端）
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        review_requested: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Request review error:', updateError);
      return NextResponse.json(
        { error: 'Failed to request review', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: updated,
      hasReview: !!booking.review_data,
    });
  } catch (error: any) {
    console.error('Request review API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
