import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

import { TimeEngine } from '@/lib/timeEngine';

export const dynamic = 'force-dynamic';

export const maxDuration = 15;

/**
 * GET /api/master/dashboard?page=1&limit=10
 * 合并加载师傅后台所有数据：profile + 分页orders + customers + availability
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    const supabase = createServiceClient();

    // 1. 师傅数据库状态
    const { data: master } = await authSupabase
      .from('masters')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    // 2. 分页订单（用于展示）
    let bookingsQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('master_id', masterInfo.slug)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // 同时查询所有订单用于统计（不分页）
    let allBookingsQuery = supabase
      .from('bookings')
      .select('*')
      .eq('master_id', masterInfo.slug)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const [
      { data: bookings, error: bookingsError, count },
      { data: allBookings }
    ] = await Promise.all([bookingsQuery, allBookingsQuery]);

    if (bookingsError) {
      console.error('Dashboard bookings error:', bookingsError);
    }

    const totalBookings = count || 0;
    const hasMore = offset + (bookings?.length || 0) < totalBookings;

    const userIdsFromBookings = Array.from(new Set((bookings || []).map((b: any) => b.user_id)));
    let profileMap: Record<string, any> = {};
    if (userIdsFromBookings.length > 0) {
      const { data: bookingProfiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIdsFromBookings);
      (bookingProfiles || []).forEach((p: any) => { profileMap[p.id] = p; });
    }

    const bookingsWithUser = (bookings || []).map((b: any) => ({
      ...b,
      user_email: profileMap[b.user_id]?.email || '',
      user_name: profileMap[b.user_id]?.full_name || '',
    }));

    // 3. 客户列表（限制30个）
    const { data: customerBookings } = await supabase
      .from('bookings')
      .select('id, user_id, status, payment_status, order_number, created_at, consultation_type, service_id')
      .eq('master_id', masterInfo.slug)
      .is('deleted_at', null)
      .not('status', 'eq', 'cancelled')
      .in('payment_status', ['paid', 'confirmed'])
      .order('created_at', { ascending: false })
      .limit(200);

    const userIds = Array.from(new Set((customerBookings || []).map((b: any) => b.user_id)));
    let customers: any[] = [];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

      const customersMap: Record<string, any> = {};
      (customerBookings || []).forEach((booking: any) => {
        const userId = booking.user_id;
        if (!customersMap[userId]) {
          customersMap[userId] = {
            user: profileMap[userId] || { id: userId, email: '', full_name: '' },
            bookings: [],
            lastBookingDate: booking.created_at,
          };
        }
        customersMap[userId].bookings.push(booking);
        if (booking.created_at > customersMap[userId].lastBookingDate) {
          customersMap[userId].lastBookingDate = booking.created_at;
        }
      });

      customers = Object.values(customersMap).sort(
        (a: any, b: any) => new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime()
      ).slice(0, 30);
    }

    // 4. 明天可用时段
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const { data: availability } = await supabase
      .from('master_availability')
      .select('available_slots')
      .eq('master_id', master?.id || '')
      .eq('date', dateStr)
      .single();

    // 5. 计算统计数据（基于 TimeEngine displayStatus，与前端保持一致）
    const visibleAllBookings = (allBookings || []).filter((b: any) => !b.deleted_at && b.status !== 'cancelled' && b.payment_status !== 'cancelled' && b.payment_status !== 'refunded');
    const getDisplayStatusForAPI = (b: any) => {
      return TimeEngine.getSessionState({
        status: b.status,
        scheduled_at: b.scheduled_at || null,
        duration_minutes: b.duration_minutes || 30,
        expires_at: b.expires_at,
      });
    };

    const statsTotal = visibleAllBookings.length;
    const statsPending = visibleAllBookings.filter((b: any) => {
      const ds = getDisplayStatusForAPI(b);
      return b.payment_status === 'paid' && (ds === 'confirmed' || ds === 'upcoming');
    }).length;
    const statsProcessing = visibleAllBookings.filter((b: any) => {
      const ds = getDisplayStatusForAPI(b);
      return b.payment_status === 'paid' && ds === 'in_progress';
    }).length;
    const statsCompleted = visibleAllBookings.filter((b: any) => {
      const ds = getDisplayStatusForAPI(b);
      return ds === 'completed' || ds === 'ended';
    }).length;
    const statsRefund = visibleAllBookings.filter((b: any) => b.status === 'refund_requested' || b.payment_status === 'refund_requested').length;
    const statsMessage = visibleAllBookings.filter((b: any) => b.consultation_type === 'message').length;
  const statsExpired = visibleAllBookings.filter((b: any) => getDisplayStatusForAPI(b) === 'expired').length;
    const statsEarnings = visibleAllBookings
      .filter((b: any) => ['completed', 'confirmed', 'in_progress'].includes(b.status) && b.payment_status === 'paid')
      .reduce((sum: number, b: any) => sum + (b.total_amount || 0) * 0.7, 0);

    return NextResponse.json({
      master: {
        ...masterInfo,
        id: master?.id,
        status: master?.status || 'online',
      },
      bookings: bookingsWithUser || [],
      bookingsPagination: {
        page,
        limit,
        total: totalBookings,
        hasMore,
      },
      customers,
      availability: {
        date: dateStr,
        available_slots: availability?.available_slots || [],
      },
      stats: {
        total: statsTotal,
        pending: statsPending,
        processing: statsProcessing,
        completed: statsCompleted,
        refund: statsRefund,
        message: statsMessage,
        expired: statsExpired,
        earnings: statsEarnings,
      },
    });

  } catch (error: any) {
    console.error('Master dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
