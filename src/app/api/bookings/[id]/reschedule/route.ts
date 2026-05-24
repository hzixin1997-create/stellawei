import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookings/[id]/reschedule
 * 用户修改已付款订单的预约时间（仅限未开始的实时咨询）
 * Body: { scheduled_date: "2026-05-24", scheduled_time: "14:00" }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { scheduled_date, scheduled_time } = body;

    if (!scheduled_date || !scheduled_time) {
      return NextResponse.json(
        { error: 'Missing scheduled_date or scheduled_time' },
        { status: 400 }
      );
    }

    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 获取订单信息
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, master_id, status, payment_status, scheduled_date, scheduled_time, scheduled_at, duration_minutes, consultation_type')
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 权限检查：只能修改自己的订单
    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 只能修改实时咨询（非留言）
    if (booking.consultation_type === 'message') {
      return NextResponse.json(
        { error: 'Message consultations cannot reschedule' },
        { status: 400 }
      );
    }

    // 只能修改已付款的订单
    if (booking.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Only paid bookings can be rescheduled' },
        { status: 400 }
      );
    }

    // 检查订单是否已经开始或结束
    if (booking.scheduled_at && booking.duration_minutes) {
      const scheduledTime = new Date(booking.scheduled_at).getTime();
      const endTime = scheduledTime + booking.duration_minutes * 60 * 1000;
      if (Date.now() >= scheduledTime) {
        return NextResponse.json(
          { error: 'Cannot reschedule a consultation that has already started or ended' },
          { status: 400 }
        );
      }
    }

    // 2小时缓冲校验
    const [hour, minute] = scheduled_time.split(':').map(Number);
    const newDateTime = new Date(scheduled_date);
    newDateTime.setHours(hour, minute, 0, 0);
    const minBookingTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    if (newDateTime.getTime() < minBookingTime.getTime()) {
      return NextResponse.json(
        { error: 'Real-time consultations must be booked at least 2 hours in advance' },
        { status: 400 }
      );
    }

    // 检查师傅是否设置了可用时段
    const { data: masterRecord } = await supabase
      .from('masters')
      .select('id')
      .eq('slug', booking.master_id)
      .single();
    const masterUuid = masterRecord?.id || booking.master_id;

    const { data: availability } = await supabase
      .from('master_availability')
      .select('available_slots')
      .eq('master_id', masterUuid)
      .eq('date', scheduled_date)
      .single();

    if (availability?.available_slots && availability.available_slots.length > 0) {
      if (!availability.available_slots.includes(scheduled_time)) {
        return NextResponse.json(
          { error: 'Master has not opened this time slot' },
          { status: 400 }
        );
      }
    }

    // 检查新时间槽是否被占用（排除自己）
    const { data: occupiedBookings, error: occupiedError } = await supabase
      .from('bookings')
      .select('id, status, expires_at')
      .eq('master_id', booking.master_id)
      .eq('scheduled_date', scheduled_date)
      .eq('scheduled_time', scheduled_time)
      .in('status', ['pending', 'paid', 'confirmed', 'in_progress']);

    if (occupiedError) {
      console.error('Reschedule check slot error:', occupiedError);
      return NextResponse.json(
        { error: 'Failed to check slot availability' },
        { status: 500 }
      );
    }

    const now = Date.now();
    const isOccupied = (occupiedBookings || []).some((b: any) => {
      if (b.id === id) return false; // 排除自己
      if (['paid', 'confirmed', 'in_progress'].includes(b.status)) return true;
      if (b.status === 'pending') {
        if (!b.expires_at) return true;
        return new Date(b.expires_at).getTime() > now;
      }
      return false;
    });

    if (isOccupied) {
      return NextResponse.json(
        { error: 'This time slot is already occupied' },
        { status: 400 }
      );
    }

    // 生成新的 scheduled_at
    const [year, month, day] = scheduled_date.split('-').map(Number);
    const scheduledAt = new Date(year, month - 1, day, hour, minute).toISOString();

    // 更新订单时间
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update({
        scheduled_date,
        scheduled_time,
        scheduled_at: scheduledAt,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Reschedule update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update booking', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: 'Booking rescheduled successfully',
    });
  } catch (error: any) {
    console.error('Reschedule API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
