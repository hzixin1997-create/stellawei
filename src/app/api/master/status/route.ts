import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/master/status
 * 师傅更新自己的在线状态（online/offline/rest）
 */
export async function PUT(request: Request) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();

    if (!['online', 'offline', 'rest'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be online, offline, or rest' }, { status: 400 });
    }

    // 获取师傅记录
    const { data: master } = await authSupabase
      .from('masters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    const { error } = await authSupabase
      .from('masters')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', master.id);

    if (error) {
      console.error('Update master status error:', error);
      return NextResponse.json({ error: 'Failed to update status', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('Master status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
