import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMasterByEmail } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/master/profile
 * 获取当前登录师傅的信息（包含数据库状态）
 */
export async function GET() {
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

    // 从数据库获取实时状态
    const { data: master } = await authSupabase
      .from('masters')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      master: {
        ...masterInfo,
        id: master?.id,
        status: master?.status || 'online',
      },
    });
  } catch (error: any) {
    console.error('Master profile API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
