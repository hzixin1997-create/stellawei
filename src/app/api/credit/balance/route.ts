import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 获取余额和最近交易
  const [{ data: userData }, { data: transactions }] = await Promise.all([
    supabase.from('users').select('credit_balance').eq('id', user.id).single(),
    supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    balance: userData?.credit_balance ?? 0,
    transactions: transactions ?? [],
  });
}
