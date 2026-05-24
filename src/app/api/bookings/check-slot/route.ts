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

    // 2小时预约缓冲校验
    const [hour, minute] = time.split(':').map(Number);
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(hour, minute, 0, 0);
    
    const minBookingTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    
    if (scheduledDateTime.getTime() < minBookingTime.getTime()) {
      return NextResponse.json({
        available: false,
        occupiedCount: 1,
        reason: 'Real-time consultations must be booked at least 2 hours in advance',
      });
    }

    // 先检查师傅可用时段设置
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

    // 如果师傅设置了可用时段，检查所选时间是否在列表中
    if (availability?.available_slots && availability.available_slots.length > 0) {
      if (!availability.available_slots.includes(time)) {
        return NextResponse.json({
          available: false,
          occupiedCount: 1,
          reason: 'Master has not opened this time slot',
        });
      }
    }

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
    // paid/confirmed/in_progress: 永久占用
    // pending: 看 expires_at，过期即释放
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
