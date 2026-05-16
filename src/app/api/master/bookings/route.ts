import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/master/bookings
 * 师傅获取分配到的 bookings（绕过 RLS）
 */
export async function GET(request: Request) {
  try {
    // 鉴权：获取当前用户
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

    const supabase = createServiceClient();

    // 查询当前师傅的 bookings（用 service key 绕过 RLS）
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('master_id', masterInfo.slug)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Master bookings fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookings', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings: bookings || [] });
  } catch (error: any) {
    console.error('Master bookings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
