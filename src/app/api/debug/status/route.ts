import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table');

  if (table === 'bookings') {
    const masterId = searchParams.get('master_id');
    const where = searchParams.get('where');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase.from('bookings').select('*').limit(limit).order('created_at', { ascending: false });

    if (masterId) {
      query = query.eq('master_id', masterId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      count: data?.length || 0,
      bookings: data || [],
      timestamp: new Date().toISOString(),
    });
  }

  // 默认：查 masters
  const { data: masters, error } = await supabase
    .from('masters')
    .select('id, user_id, display_name, status, is_active')
    .order('display_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: masters?.length || 0,
    masters: masters || [],
    timestamp: new Date().toISOString(),
  });
}
