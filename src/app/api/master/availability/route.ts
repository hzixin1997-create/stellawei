import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/master/availability?date=2026-05-23
 * 获取当前登录师傅某天的可用时段
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 从header获取当前用户token
    const authHeader = request.headers.get('authorization');
    let masterId = '';

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // 查找师傅ID
      const { data: master } = await supabase
        .from('masters')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (master) {
        masterId = master.id;
      }
    }

    if (!masterId) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('master_availability')
      .select('available_slots')
      .eq('master_id', masterId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get availability error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      master_id: masterId,
      date,
      available_slots: data?.available_slots || [],
    });
  } catch (error: any) {
    console.error('Availability GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/master/availability
 * 设置师傅某天的可用时段
 * Body: { date: "2026-05-23", available_slots: ["09:00", "10:00", "14:00"] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, available_slots } = body;

    if (!date || !Array.isArray(available_slots)) {
      return NextResponse.json({ error: 'Missing date or available_slots' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const authHeader = request.headers.get('authorization');
    let masterId = '';

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const { data: master } = await supabase
        .from('masters')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (master) {
        masterId = master.id;
      }
    }

    if (!masterId) {
      return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    }

    // Upsert
    const { data, error } = await supabase
      .from('master_availability')
      .upsert(
        {
          master_id: masterId,
          date,
          available_slots,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'master_id,date' }
      )
      .select();

    if (error) {
      console.error('Set availability error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      master_id: masterId,
      date,
      available_slots,
    });
  } catch (error: any) {
    console.error('Availability POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
