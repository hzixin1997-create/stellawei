import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { refCode } = await request.json();

  if (!refCode) {
    return NextResponse.json({ error: 'Missing ref code' }, { status: 400 });
  }

  // 查找推荐码对应的用户
  const { data: referralCode, error } = await supabase
    .from('referral_codes')
    .select('user_id')
    .eq('code', refCode)
    .single();

  if (error || !referralCode) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  // 返回推荐人信息（不暴露敏感数据）
  return NextResponse.json({
    referrerId: referralCode.user_id,
    valid: true,
  });
}
