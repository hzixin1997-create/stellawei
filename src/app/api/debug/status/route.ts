import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServiceClient();
  
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
