import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // 获取用户信息
  const { data: user } = await supabase
    .from('profiles')
    .select('email, name, language_preference')
    .eq('id', userId)
    .single();

  if (!user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 检查是否已经发送过邀请（status = sent 才算已发送）
  const { data: existingLog } = await supabase
    .from('email_logs')
    .select('id, status')
    .eq('user_id', userId)
    .eq('template_type', 'referral_invitation')
    .eq('status', 'sent')
    .single();

  if (existingLog) {
    return NextResponse.json({ message: 'Invitation already sent' });
  }

  // 获取用户推荐码
  const { data: referralCode } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', userId)
    .single();

  const code = referralCode?.code || '';
  const language = user.language_preference || 'en';
  const name = user.name || 'Friend';

  // 发送邮件
  try {
    await resend.emails.send({
      from: 'Stellawei <support@stellawei.org>',
      to: user.email,
      subject: language === 'zh' 
        ? '一份给需要清晰的人的礼物 ✨'
        : 'A small gift for someone who may need clarity ✨',
      html: language === 'zh'
        ? getChineseEmail(name, code)
        : getEnglishEmail(name, code),
    });

    // 更新 email_logs 状态为 sent
    await supabase
      .from('email_logs')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('template_type', 'referral_invitation')
      .eq('status', 'pending');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send referral invitation:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

function getEnglishEmail(name: string, code: string): string {
  return `
    <p>Hi ${name},</p>
    <p>Thank you for trusting StellaWei.</p>
    <p>Many people come to us during moments when they feel uncertain:</p>
    <p>"Should I stay in this relationship?"<br>
    "Is it time for a career change?"<br>
    "Am I moving in the right direction?"</p>
    <p>If someone you care about is facing a similar moment,<br>
    you can share StellaWei with them.</p>
    <p>Your referral link:<br>
    <a href="https://stellawei.org/?ref=${code}">https://stellawei.org/?ref=${code}</a></p>
    <p>When they complete their first consultation,<br>
    we'll add a $5 credit to your account for your next session.</p>
    <p>Thank you for helping someone find clarity.</p>
    <p>— StellaWei</p>
  `;
}

function getChineseEmail(name: string, code: string): string {
  return `
    <p>Hi ${name},</p>
    <p>感谢你对 StellaWei 的信任。</p>
    <p>很多人在面对人生困惑时选择向我们求助：</p>
    <p>"我应该继续这段关系吗？"<br>
    "是时候换工作了吗？"<br>
    "我是否在正确的方向上前行？"</p>
    <p>如果你身边有人正在经历类似的困惑，<br>
    可以将 StellaWei 分享给他们。</p>
    <p>你的专属推荐链接：<br>
    <a href="https://stellawei.org/?ref=${code}">https://stellawei.org/?ref=${code}</a></p>
    <p>当他们完成首次咨询后，<br>
    我们将为你的账户添加 $5 咨询余额，用于你的下次咨询。</p>
    <p>感谢你帮助他人找到清晰的方向。</p>
    <p>— StellaWei</p>
  `;
}
