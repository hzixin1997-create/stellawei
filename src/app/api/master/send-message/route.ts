import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/master/send-message
 * 师傅给客户发送消息（通过 booking 的聊天系统）
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, content, message_source = 'follow_up' } = body;

    if (!bookingId || !content?.trim()) {
      return NextResponse.json(
        { error: 'Missing required parameters: bookingId, content' },
        { status: 400 }
      );
    }

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 使用白名单获取师傅信息
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: 'Not a master' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 1. 验证 booking 属于这个师傅
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, master_id, status')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.master_id !== masterInfo.slug) {
      return NextResponse.json({ error: 'Not authorized for this booking' }, { status: 403 });
    }

    // 2. 插入消息
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        sender_type: 'master',
        sender_name: masterInfo.name || 'Master',
        content: content.trim(),
        source: message_source,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (msgError) {
      return NextResponse.json(
        { error: 'Failed to send message', message: msgError.message },
        { status: 500 }
      );
    }

    // 3. 如果是留言咨询，自动完成订单
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .eq('consultation_type', 'message');
      
      if (updateError) {
      }
    } catch (err) {
    }

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}