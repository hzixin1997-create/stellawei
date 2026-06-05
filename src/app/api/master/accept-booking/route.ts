import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { getMessage } from '@/lib/i18n';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing bookingId' },
        { status: 400 }
      );
    }

    // 鉴权：验证师傅身份
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 获取师傅信息（用 email 从白名单取 slug， bookings.master_id 存的是 slug）
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    // 获取 booking 并验证归属
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('master_id', masterInfo.slug)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: getMessage('BOOKING_NOT_FOUND', request) },
        { status: 404 }
      );
    }

    // 检查是否可以接单（只有 paid 状态可以接单）
    if (booking.payment_status !== 'paid' || booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Booking cannot be accepted', currentStatus: booking.status },
        { status: 400 }
      );
    }

    // 更新订单状态为 confirmed
    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: getMessage('ACCEPT_FAILED', request), message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: updated,
    });
  } catch (error: any) {
    console.error('Accept booking error:', error);
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}
