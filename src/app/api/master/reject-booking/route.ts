import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { getMessage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * POST /api/master/reject-booking
 * 师傅拒绝订单
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 验证师傅身份
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    // 验证 booking 存在且属于该师傅
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, master_id, status, payment_status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: getMessage('BOOKING_NOT_FOUND', request) }, { status: 404 });
    }

    if (booking.master_id !== masterInfo.slug) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    // 更新订单状态为 cancelled
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error('Reject booking error:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject booking', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Reject booking API error:', error);
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}
