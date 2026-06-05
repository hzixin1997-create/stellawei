import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { TimeEngine } from '@/lib/timeEngine';

export const dynamic = 'force-dynamic';

const ALL_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '19:00', '19:30', '20:00', '20:30'
];

/**
 * GET /api/bookings/occupied-slots?master_id=xxx&date=2026-05-16&duration_minutes=25
 * 返回指定师傅某天的可用/占用时段（基于区间重叠检测）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('master_id');
    const date = searchParams.get('date');
    const durationMinutes = parseInt(searchParams.get('duration_minutes') || '25', 10);

    if (!masterId || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 查询同师傅当天所有非取消/非退款的订单
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, scheduled_time, duration_minutes, status, created_at, expires_at')
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

    // 过滤出有效占用的订单
    const now = Date.now();
    const existingBookings = (bookings || [])
      .filter((b: any) => {
        if (['paid', 'confirmed', 'in_progress'].includes(b.status)) return true;
        if (b.status === 'pending') {
          if (!b.expires_at) return true;
          return new Date(b.expires_at).getTime() > now;
        }
        return false;
      })
      .map((b: any) => ({
        scheduled_time: b.scheduled_time,
        duration_minutes: b.duration_minutes || 30,
      }));

    // 获取师傅设置的可用时段
    const { data: masterRecord } = await supabase
      .from('masters')
      .select('id')
      .eq('slug', masterId)
      .single();
    const masterUuid = masterRecord?.id || masterId;

    const { data: availability } = await supabase
      .from('master_availability')
      .select('available_slots')
      .eq('master_id', masterUuid)
      .eq('date', date)
      .single();

    // 检查师傅是否有任何可用时段设置记录
    const { data: anyAvailability } = await supabase
      .from('master_availability')
      .select('id')
      .eq('master_id', masterUuid)
      .limit(1);

    const hasAvailabilitySettings = anyAvailability && anyAvailability.length > 0;

    // 计算开放时段：师傅有设置则使用设置，否则全天开放
    let openSlots: string[] = [];
    if (hasAvailabilitySettings) {
      if (availability?.available_slots && availability.available_slots.length > 0) {
        openSlots = availability.available_slots;
      } else {
        openSlots = []; // 师傅没设置这天，全部关闭
      }
    } else {
      openSlots = ALL_SLOTS; // 师傅从来没设置过，默认全天开放
    }

    // 使用 TimeEngine 做区间重叠检测，计算可用/占用时段
    const { availableSlots, occupiedSlots } = TimeEngine.getAvailableSlots(
      date,
      openSlots,
      existingBookings,
      durationMinutes
    );

    // 补充：师傅未开放但未被占用的时段（用于显示"不可约"）
    const unavailableSlots = ALL_SLOTS.filter(s => !openSlots.includes(s) && !occupiedSlots.includes(s));

    return NextResponse.json({
      occupiedSlots,
      available_slots: availableSlots,
      unavailableSlots,
      existingBookings: existingBookings.length,
      durationMinutes,
      count: occupiedSlots.length + unavailableSlots.length,
    });
  } catch (error: any) {
    console.error('Occupied slots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
