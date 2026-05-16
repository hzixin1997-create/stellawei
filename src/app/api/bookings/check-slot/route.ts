import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/check-slot?master_id=xxx&date=2026-05-16&time=14:00
 * 检查时间段是否被占用
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('master_id');
    const date = searchParams.get('date');
    const time = searchParams.get('time');

    if (!masterId || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, status, expires_at')
      .eq('master_id', masterId)
      .eq('scheduled_date', date)
      .eq('scheduled_time', time)
      .not('status', 'in', '(cancelled,refunded)');

    if (error) {
      console.error('Check slot error:', error);
      return NextResponse.json(
        { error: 'Failed to check slot', message: error.message },
        { status: 500 }
      );
    }

    // 判断是否有有效占用
    const now = Date.now();
    const occupied = (bookings || []).filter((b: any) => {
      if (['paid', 'confirmed', 'in_progress'].includes(b.status)) return true;
      if (b.status === 'pending') {
        if (!b.expires_at) return true;
        return new Date(b.expires_at).getTime() > now;
      }
      return false;
    });

    return NextResponse.json({
      available: occupied.length === 0,
      occupiedCount: occupied.length,
    });
  } catch (error: any) {
    console.error('Check slot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
