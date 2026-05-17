import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const adminEmails = ['hzixin1997@gmail.com', 'zixihuang@foxmail.com'];

async function getUserFromToken(token: string) {
  // 直接用 token 调用 Supabase Auth API 验证用户
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/auth/v1/user`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

/**
 * PUT /api/admin/master-status
 * 总裁修改指定师傅的状态（online/offline/rest）
 */
export async function PUT(request: Request) {
  try {
    // 从 header 提取 Bearer token
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: missing token' }, { status: 401 });
    }

    // 验证用户
    const user = await getUserFromToken(token);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    // 检查是否是管理员
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    const { masterId, status } = await request.json();

    if (!masterId || !['online', 'offline', 'rest'].includes(status)) {
      return NextResponse.json({ error: 'Invalid masterId or status' }, { status: 400 });
    }

    // 用 service role key 绕过 RLS 更新数据库
    const supabase = createServiceClient();
    const { error } = await supabase
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
