import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { bookingId, amount } = await request.json();

  if (!bookingId || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // 检查 booking 是否为 first-time（不可使用 credit）
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('is_first_time')
    .eq('id', bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.is_first_time) {
    return NextResponse.json(
      { error: 'First-time offer cannot be combined with credit' },
      { status: 400 }
    );
  }

  // 调用数据库函数应用 credit
  const { data, error } = await supabase.rpc('apply_credit_to_booking', {
    p_user_id: user.id,
    p_booking_id: bookingId,
    p_amount: amount,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    appliedAmount: data,
    success: true,
  });
}
