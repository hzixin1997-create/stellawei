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
      .select('id, status, created_at, expires_at')
      .eq('master_id', masterId)
      .eq('scheduled_date', date)
      .eq('scheduled_time', time)
      .in('status', ['pending', 'paid', 'confirmed', 'in_progress']);

    if (error) {
      console.error('Check slot error:', error);
      return NextResponse.json(
        { error: 'Failed to check slot', message: error.message },
        { status: 500 }
      );
    }

    // 判断是否有有效占用
    // paid/confirmed/in_progress: 永久占用（已付/已接/进行中）
    // pending: 保留30分钟占位（created_at + 30分钟）
    // 已过期 pending（超过30分钟未支付）不算占用
    const now = Date.now();
    const SLOT_HOLD_MINUTES = 30;
    const occupied = (bookings || []).filter((b: any) => {
      // 已付款/已接单/进行中 → 永久占用
      if (['paid', 'confirmed', 'in_progress'].includes(b.status)) return true;
      // pending 订单：只保留30分钟占位
      if (b.status === 'pending') {
        const createdAt = new Date(b.created_at || Date.now()).getTime();
        const holdUntil = createdAt + SLOT_HOLD_MINUTES * 60 * 1000;
        return holdUntil > now; // 30分钟内才算占用
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
