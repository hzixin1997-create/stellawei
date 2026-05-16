import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required parameter: ids (array of booking IDs)' },
        { status: 400 }
      );
    }

    // 鉴权：验证管理员身份
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = user.email === 'hzixin1997@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // 批量软删除
    const { data, error } = await supabase
      .from('bookings')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'cancelled',
        payment_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
      .select(); // 返回更新后的数据

    if (error) {
      console.error('Batch delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete bookings', message: error.message },
        { status: 500 }
      );
    }

    console.log('Batch delete success:', data);

    return NextResponse.json({
      success: true,
      deletedCount: ids.length,
      updated: data,
    });
  } catch (error: any) {
    console.error('Batch delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
