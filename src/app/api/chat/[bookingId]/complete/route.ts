import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证 booking 存在
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 检查权限
    const masterInfo = getMasterByEmail(user.email || '');
    const isUser = booking.user_id === user.id;
    const isMaster = masterInfo && booking.master_id === masterInfo.slug;

    if (!isUser && !isMaster) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 检查订单状态
    if (booking.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Booking is not in progress', currentStatus: booking.status },
        { status: 400 }
      );
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Booking not paid' }, { status: 400 });
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
        { error: 'Failed to complete booking', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Complete chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
