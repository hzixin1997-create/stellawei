import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/master-status
 * 总裁修改指定师傅的状态（online/offline/rest）
 */
export async function PUT(request: Request) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 检查是否是管理员（通过邮箱判断）
    const adminEmails = ['hzixin1997@gmail.com', 'zixihuang@foxmail.com'];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { masterId, status } = await request.json();

    if (!masterId || !['online', 'offline', 'rest'].includes(status)) {
      return NextResponse.json({ error: 'Invalid masterId or status' }, { status: 400 });
    }

    const { error } = await authSupabase
      .from('masters')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', masterId);

    if (error) {
      console.error('Admin update master status error:', error);
      return NextResponse.json({ error: 'Failed to update status', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, masterId, status });
  } catch (error: any) {
    console.error('Admin master status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
