import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/master/status
 * 师傅更新自己的在线状态（online/offline/rest）
 */
export async function PUT(request: Request) {
  try {
    // 从 header 提取 Bearer token
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
    }

    // 验证用户：直接用 Supabase auth.getUser(token) 验证 JWT
    const supabase = createServiceClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    const { status } = await request.json();

    if (!['online', 'offline', 'rest'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be online, offline, or rest' }, { status: 400 });
    }

    // 获取师傅记录
    const { data: master } = await supabase
      .from('masters')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!master) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    // 用 service role key 绕过 RLS 更新
    const { data: updatedRows, error } = await supabase
      .from('masters')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', master.id)
      .select('id, status');

    if (error) {
      console.error('Update master status error:', error);
      return NextResponse.json({ error: 'Failed to update status', details: error.message }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: 'Master not found or no change needed' }, { status: 404 });
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
