import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 验证师傅身份
    const masterInfo = getMasterByEmail(user.email || '');
    if (!masterInfo) {
      return NextResponse.json({ error: 'Not a master' }, { status: 403 });
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

    return NextResponse.json({
      success: true,
      bookings: bookings || [],
      count: (bookings || []).length,
    });
  } catch (error: any) {
    console.error('Master bookings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
