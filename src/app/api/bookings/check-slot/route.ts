import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { TimeEngine } from '@/lib/timeEngine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/check-slot?master_id=xxx&date=2026-05-16&time=14:00&duration_minutes=25
 * 检查时间段是否可用（区间重叠检测）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get('master_id');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const durationMinutes = parseInt(searchParams.get('duration_minutes') || '25', 10);

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

    // 查询同师傅当天所有非取消/非退款的订单（包含 duration_minutes）
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, scheduled_time, duration_minutes, status, created_at, expires_at')
      .eq('master_id', masterId)
      .eq('scheduled_date', date)
      .not('status', 'in', '(cancelled,refunded)');

    if (error) {
      console.error('Check slot error:', error);
      return NextResponse.json(
        { error: 'Failed to check slot', message: error.message },
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

    // 使用 TimeEngine 做区间重叠检测
    const isAvailable = TimeEngine.isTimeSlotAvailable(
      time,
      date,
      durationMinutes,
      existingBookings
    );

    // 找出冲突的订单详情（用于调试）
    const conflicts = (bookings || [])
      .filter((b: any) => {
        if (['paid', 'confirmed', 'in_progress'].includes(b.status)) return true;
        if (b.status === 'pending') {
          if (!b.expires_at) return true;
          return new Date(b.expires_at).getTime() > now;
        }
        return false;
      })
      .filter((b: any) => {
        const newStart = TimeEngine.parseUTC(`${date}T${time.slice(0, 5)}:00`);
        const newEnd = newStart + durationMinutes * 60 * 1000;
        const existingStart = TimeEngine.parseUTC(`${date}T${b.scheduled_time.slice(0, 5)}:00`);
        const existingEnd = existingStart + (b.duration_minutes || 30) * 60 * 1000;
        return newStart < existingEnd && newEnd > existingStart;
      });

    return NextResponse.json({
      available: isAvailable,
      occupiedCount: existingBookings.length,
      conflictCount: conflicts.length,
      conflicts: conflicts.map((c: any) => ({
        id: c.id,
        scheduled_time: c.scheduled_time,
        duration_minutes: c.duration_minutes,
        status: c.status,
      })),
    });
  } catch (error: any) {
    console.error('Check slot API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
