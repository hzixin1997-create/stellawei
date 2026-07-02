import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { getMessage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * POST /api/master/complete-message
 * 师傅手动标记留言咨询为完成
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing required parameter: bookingId' },
        { status: 400 }
      );
    }

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 验证 booking 属于当前师傅且是留言咨询
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, master_id, status, consultation_type')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: getMessage('BOOKING_NOT_FOUND', request) }, { status: 404 });
    }

    if (booking.master_id !== masterInfo.slug) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    if (booking.consultation_type !== 'message') {
      return NextResponse.json({ error: 'Only message consultations can be completed this way' }, { status: 400 });
    }

    // 更新订单状态为已完成
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Complete message booking error:', updateError);
      return NextResponse.json({ error: 'Failed to complete booking', message: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'completed' });
  } catch (error: any) {
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}
