import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/occupied-slots?master_id=xxx&date=2026-05-16
 * 返回指定师傅某天的所有已占用时间槽
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('master_id');
    const date = searchParams.get('date');

    if (!masterId || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('scheduled_time, status, expires_at')
      .eq('master_id', masterId)
      .eq('scheduled_date', date)
      .not('status', 'in', '(cancelled,refunded)');

    if (error) {
      console.error('Occupied slots error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch occupied slots', message: error.message },
        { status: 500 }
      );
    }

    // 过滤出有效占用的时段
    const now = Date.now();
    const occupiedSlots = (bookings || [])
      .filter((b: any) => {
        if (['paid', 'confirmed', 'in_progress'].includes(b.status)) return true;
        if (b.status === 'pending') {
          if (!b.expires_at) return true;
          return new Date(b.expires_at).getTime() > now;
        }
        return false;
      })
      .map((b: any) => b.scheduled_time)
      // 去重
      .filter((value: string, index: number, self: string[]) => self.indexOf(value) === index);

    return NextResponse.json({
      occupiedSlots,
      count: occupiedSlots.length,
    });
  } catch (error: any) {
    console.error('Occupied slots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
