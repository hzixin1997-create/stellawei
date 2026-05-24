import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/master/messages?user_id=xxx
 * 获取师傅发给特定用户的所有 follow_up 消息
 */
export async function GET(request: Request) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: 'Not a master' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. 获取师傅和用户之间的所有 bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .eq('master_id', masterInfo.slug)
      .eq('user_id', userId);

    if (bookingsError) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    const bookingIds = (bookings || []).map((b: any) => b.id);
    if (bookingIds.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // 2. 获取师傅发的 follow_up 消息
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .in('booking_id', bookingIds)
      .eq('sender_type', 'master')
      .eq('source', 'follow_up')
      .order('created_at', { ascending: false });

    if (messagesError) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
