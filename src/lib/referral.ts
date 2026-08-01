'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useReferralTracking() {
  const supabase = createClient();

  useEffect(() => {
    // 检查 URL 中是否有 ref 参数
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    if (refCode) {
      // 保存到 localStorage，注册时使用
      localStorage.setItem('referral_code', refCode);
    }
  }, []);
}

export async function applyReferralOnSignup(userId: string) {
  const supabase = createClient();
  const refCode = localStorage.getItem('referral_code');

  if (!refCode) return;

  try {
    // 验证推荐码
    const { data: referralCode } = await supabase
      .from('referral_codes')
      .select('user_id, id')
      .eq('code', refCode)
      .single();

    if (!referralCode || referralCode.user_id === userId) {
      // 自我推荐或无效码，清除
      localStorage.removeItem('referral_code');
      return;
    }

    // 创建推荐关系
    await supabase.from('referred_users').insert({
      referrer_id: referralCode.user_id,
      referred_user_id: userId,
      referral_code_id: referralCode.id,
      status: 'registered',
    });

    // 清除 localStorage
    localStorage.removeItem('referral_code');
  } catch (error) {
    console.error('Error applying referral:', error);
  }
}
