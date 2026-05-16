import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/check-first-time
 * 检查当前用户是否已有支付过的订单（首单检查）
 */
export async function GET(request: Request) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 查询该用户是否有已支付的订单
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('user_id', user.id)
      .eq('payment_status', 'paid')
      .limit(1);

    if (error) {
      console.error('Check first time error:', error);
      return NextResponse.json(
        { error: 'Failed to check first time status' },
        { status: 500 }
      );
    }

    const hasPaidBooking = bookings && bookings.length > 0;

    return NextResponse.json({ isFirstTime: !hasPaidBooking });
  } catch (error: any) {
    console.error('Check first time API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
