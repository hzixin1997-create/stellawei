import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bookings
 * 获取所有预约（含时间槽信息），用于总裁后台预约管理
 */
export async function GET(request: Request) {
  try {
    // 鉴权：验证管理员身份
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.email === 'hzixin1997@gmail.com' || user.email === 'zixihuang@foxmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const masterFilter = searchParams.get('master_id');
    const dateFilter = searchParams.get('date');

    let query = supabase
      .from('bookings')
      .select('id, order_number, user_id, master_id, service_id, consultation_type, scheduled_date, scheduled_time, scheduled_at, duration_minutes, status, payment_status, total_amount, currency, created_at, updated_at, is_first_time, tier, duration_text, deleted_at')
      .filter('deleted_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (masterFilter) {
      query = query.eq('master_id', masterFilter);
    }

    if (dateFilter) {
      query = query.eq('scheduled_date', dateFilter);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings', message: error.message },
        { status: 500 }
      );
    }

    // 按师傅和日期分组（留言咨询没有 scheduled_date，用 created_at 的日期）
    const grouped: Record<string, Record<string, any[]>> = {};
    (bookings || []).forEach((b: any) => {
      const masterId = b.master_id || 'unknown';
      const date = b.scheduled_date || b.created_at?.split('T')[0] || 'unknown';
      if (!grouped[masterId]) grouped[masterId] = {};
      if (!grouped[masterId][date]) grouped[masterId][date] = [];
      grouped[masterId][date].push(b);
    });

    return NextResponse.json({ 
      bookings: bookings || [], 
      grouped,
      total: (bookings || []).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
