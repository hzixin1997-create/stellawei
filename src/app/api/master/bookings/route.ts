import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';
import { getMessage } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * GET /api/master/bookings
 * 师傅获取自己的 bookings 订单列表（绕过 RLS）
 */
export async function GET(request: Request) {
  try {
    // 鉴权
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: getMessage('UNAUTHORIZED', request) }, { status: 401 });
    }

    // 验证师傅身份
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: getMessage('FORBIDDEN_NOT_MASTER', request) }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const consultationType = searchParams.get('type'); // 'message' | 'realtime' | null

    const supabase = createServiceClient();

    // 构建查询
    let query = supabase
      .from('bookings')
      .select('*')
      .eq('master_id', masterInfo.slug)
      .order('created_at', { ascending: false });

    if (consultationType) {
      query = query.eq('consultation_type', consultationType);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching master bookings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookings', message: error.message },
        { status: 500 }
      );
    }

    // Join user profiles
    const userIds = Array.from(new Set((bookings || []).map((b: any) => b.user_id)));
    let profileMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
    }

    const bookingsWithUser = (bookings || []).map((b: any) => ({
      ...b,
      user_email: profileMap[b.user_id]?.email || '',
      user_name: profileMap[b.user_id]?.full_name || '',
    }));

    return NextResponse.json({
      success: true,
      bookings: bookingsWithUser || [],
      count: (bookingsWithUser || []).length,
    });
  } catch (error: any) {
    console.error('Master bookings API error:', error);
    return NextResponse.json(
      { error: getMessage('INTERNAL_ERROR', request), message: error.message },
      { status: 500 }
    );
  }
}
