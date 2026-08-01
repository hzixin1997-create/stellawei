import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 获取或创建推荐码
  let { data: referralCode, error } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // 不存在，创建一个
    const code = generateCode();
    const { data: newCode, error: insertError } = await supabase
      .from('referral_codes')
      .insert({ user_id: user.id, code })
      .select('code')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create referral code' }, { status: 500 });
    }

    referralCode = newCode;
  } else if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    code: referralCode?.code,
    link: `https://stellawei.org/?ref=${referralCode?.code}`,
  });
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
