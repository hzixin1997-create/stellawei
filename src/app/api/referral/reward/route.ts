import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { bookingId, userId } = await request.json();

  if (!bookingId || !userId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // 检查是否已奖励
  const { data: existingReward } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('referral_booking_id', bookingId)
    .eq('type', 'referral_reward')
    .single();

  if (existingReward) {
    return NextResponse.json({ message: 'Reward already processed' });
  }

  // 调用数据库函数处理奖励
  const { data: rewardProcessed, error: rewardError } = await supabase.rpc(
    'process_referral_reward',
    {
      p_referred_user_id: userId,
      p_booking_id: bookingId,
    }
  );

  if (rewardError) {
    console.error('Referral reward error:', rewardError);
    return NextResponse.json({ error: rewardError.message }, { status: 500 });
  }

  if (!rewardProcessed) {
    return NextResponse.json({ message: 'No referral to reward' });
  }

  // 获取推荐人信息并发送邮件
  const { data: referral } = await supabase
    .from('referred_users')
    .select('referrer_id')
    .eq('referred_user_id', userId)
    .eq('status', 'rewarded')
    .single();

  if (referral?.referrer_id) {
    const { data: referrerUser } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', referral.referrer_id)
      .single();

    if (referrerUser?.email) {
      await sendReferralSuccessEmail(
        referrerUser.email,
        referrerUser.name || 'Friend'
      );
    }
  }

  return NextResponse.json({ success: true, message: 'Referral reward processed' });
}

async function sendReferralSuccessEmail(email: string, name: string) {
  try {
    await resend.emails.send({
      from: 'Stellawei <support@stellawei.org>',
      to: email,
      subject: 'Your StellaWei credit is ready ✨',
      html: `
        <p>Hi ${name},</p>
        <p>Someone you invited just completed their first StellaWei consultation.</p>
        <p>We've added a $5 credit to your account for your next session.</p>
        <p>Thank you for helping someone find clarity.</p>
        <p>— StellaWei</p>
      `,
    });
  } catch (error) {
    console.error('Failed to send referral success email:', error);
  }
}
