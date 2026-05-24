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
      .select('scheduled_time, status, created_at, expires_at')
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
    // paid/confirmed/in_progress: 永久占用
    // pending: 看 expires_at，过期即释放
    const now = Date.now();
    const orderOccupiedSlots = (bookings || [])
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

    // 获取师傅设置的可用时段（如果有设置的话）
    // 注意：master_availability 表使用 masters.id (UUID)，不是 slug
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

    // 标准全天时段
    const allSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
      '19:00', '19:30', '20:00', '20:30'
    ];

    // 检查师傅是否有任何可用时段设置记录
    const { data: anyAvailability } = await supabase
      .from('master_availability')
      .select('id')
      .eq('master_id', masterUuid)
      .limit(1);

    const hasAvailabilitySettings = anyAvailability && anyAvailability.length > 0;
    let availableSlots: string[] = [];

    if (hasAvailabilitySettings) {
      // 师傅已经设置过可用时段
      if (availability?.available_slots && availability.available_slots.length > 0) {
        // 师傅设置了该天的可用时段，从中排除被占用的
        const occupiedSet = new Set(orderOccupiedSlots);
        availableSlots = availability.available_slots.filter((s: string) => !occupiedSet.has(s));
      } else {
        // 师傅没设置这天（或设置为空），全部关闭
        availableSlots = [];
      }
    } else {
      // 师傅从来没设置过可用时段，默认全天开放，排除被占用的
      const occupiedSet = new Set(orderOccupiedSlots);
      availableSlots = allSlots.filter(s => !occupiedSet.has(s));
    }

    // occupiedSlots 保持原有逻辑（向后兼容）
    let occupiedSlots = orderOccupiedSlots;
    if (hasAvailabilitySettings) {
      if (availability?.available_slots && availability.available_slots.length > 0) {
        const allowedSet = new Set(availability.available_slots);
        const unavailableSlots = allSlots.filter(s => !allowedSet.has(s));
        const mergedSet = new Set([...orderOccupiedSlots, ...unavailableSlots]);
        occupiedSlots = Array.from(mergedSet);
      } else {
        occupiedSlots = Array.from(new Set([...orderOccupiedSlots, ...allSlots]));
      }
    }

    return NextResponse.json({
      occupiedSlots,
      available_slots: availableSlots,
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
