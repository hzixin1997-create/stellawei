import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId, status, payment_status } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 已登录即可操作（admin 页面已做路由级身份验证）
    if (!user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updateData.status = status;
    if (payment_status !== undefined) updateData.payment_status = payment_status;

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking: data });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}