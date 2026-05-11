import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

export async function GET(request: NextRequest) {
  try {
    // Check if required tables exist
    const tablesToCheck = [
      'profiles',
      'masters',
      'orders',
      'messages',
      'services',
      'reviews',
      'app_configs'
    ];

    const results: Record<string, boolean> = {};

    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        results[table] = !error || !error.message.includes('does not exist');
      } catch {
        results[table] = false;
      }
    }

    const allExist = Object.values(results).every(Boolean);

    return NextResponse.json({
      connected: true,
      initialized: allExist,
      tables: results,
      missing: Object.entries(results).filter(([, exists]) => !exists).map(([name]) => name)
    });
  } catch (error: any) {
    return NextResponse.json(
      { connected: false, error: error.message },
      { status: 500 }
    );
  }
}
