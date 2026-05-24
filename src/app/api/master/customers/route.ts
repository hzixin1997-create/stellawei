import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/master/customers
 * 获取师傅服务过的所有客户
 */
export async function GET(request: Request) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 使用白名单获取师傅 slug（masters 表没有 slug 字段）
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: 'Not a master' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 1. 获取师傅的所有 bookings（过滤已删除和已取消）
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, user_id, status, payment_status, order_number, created_at, consultation_type, service_id')
      .eq('master_id', masterInfo.slug)
      .is('deleted_at', null)
      .not('status', 'eq', 'cancelled')
      .in('payment_status', ['paid', 'confirmed'])
      .order('created_at', { ascending: false });

    if (bookingsError) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // 2. 获取客户用户信息
    const userIds = Array.from(new Set((bookings || []).map((b: any) => b.user_id)));
    if (userIds.length === 0) {
      return NextResponse.json({ customers: [] });
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (profilesError) {
    }

    const profileMap: Record<string, any> = {};
    (profiles || []).forEach((p: any) => {
      profileMap[p.id] = p;
    });

    // 3. 按用户分组
    const customersMap: Record<string, any> = {};
    (bookings || []).forEach((booking: any) => {
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

    const customers = Object.values(customersMap).sort(
      (a: any, b: any) => new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime()
    );

    return NextResponse.json({ customers });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}