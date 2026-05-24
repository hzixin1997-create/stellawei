import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // 检查数据库连接
    const { error: dbError } = await supabase.from('bookings').select('id').limit(1);
    
    if (dbError) {
      return NextResponse.json({
        status: 'error',
        message: 'Database connection failed',
        error: dbError.message,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'ok',
      message: 'Database connection successful',
    });
  } catch (error: any) {
    console.error('DB status check error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
    }, { status: 500 });
  }
}
