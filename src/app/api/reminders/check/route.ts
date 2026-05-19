import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendConsultationReminder } from '@/lib/email';

export const dynamic = 'force-dynamic';
// redeploy trigger: 2026-05-19 env refresh v2

// 师傅 slug → email 映射（兜底，等数据库加 email/slug 列后可移除）
const MASTER_EMAIL_MAP: Record<string, { display_name: string; email: string }> = {
  'master-luna': { display_name: 'Master Luna', email: 'lunalintarot@163.com' },
  'zhang-yihua': { display_name: 'Master Zhang Yihua', email: 'qimenyihua@gmail.com' },
  'wu-yang': { display_name: 'Master Wu Yang', email: 'mshoucangjia@gmail.com' },
};

/**
 * GET /api/reminders/check
 * 检查10分钟内即将开始的咨询，发送提醒邮件
 * 应由外部 cron 服务每5分钟调用一次
 */
export async function GET(request: Request) {
  try {
    // 简单的 API Key 保护（防止被公开访问）
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    const expectedKey = process.env.REMINDER_API_KEY;
    
    if (apiKey !== expectedKey) {
      console.warn(`[reminders/check] Auth failed. Received key: ${apiKey?.slice(0, 10)}..., Expected: ${expectedKey?.slice(0, 10)}...`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 查找10分钟内即将开始、且尚未发送提醒的咨询
    const now = new Date();
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
    const elevenMinutesLater = new Date(now.getTime() + 11 * 60 * 1000);

    const { data: upcomingBookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        user_id,
        master_id,
        service_id,
        scheduled_date,
        scheduled_time,
        scheduled_at,
        timezone,
        reminder_sent
      `)
      .eq('payment_status', 'paid')
      .eq('status', 'confirmed')
      .eq('reminder_sent', false)
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', elevenMinutesLater.toISOString());

    if (error) {
      console.error('Reminder check error:', error);
      return NextResponse.json(
        { error: 'Failed to check upcoming consultations' },
        { status: 500 }
      );
    }

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No upcoming consultations in the next 10 minutes',
        checked: 0 
      });
    }

    const results = [];

    for (const booking of upcomingBookings) {
      try {
        // 获取用户信息
        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', booking.user_id)
          .single();

        console.log(`[reminder] Booking ${booking.id}: userData=`, userData);

        if (!userData || !userData.email) {
          console.warn('Missing user data for booking:', booking.id);
          results.push({ bookingId: booking.id, error: 'Missing user email' });
          continue;
        }

        // 获取师傅信息（先查数据库，fallback 到映射表）
        let masterData: { display_name: string; email: string } | null = null;
        
        const { data: dbMaster } = await supabase
          .from('masters')
          .select('display_name, email, slug')
          .eq('slug', booking.master_id)
          .single();
        
        console.log(`[reminder] Booking ${booking.id}: dbMaster=`, dbMaster);

        if (dbMaster && dbMaster.email) {
          masterData = {
            display_name: dbMaster.display_name,
            email: dbMaster.email,
          };
        } else if (MASTER_EMAIL_MAP[booking.master_id]) {
          masterData = MASTER_EMAIL_MAP[booking.master_id];
        }

        if (!masterData) {
          console.warn('Missing master data for booking:', booking.id, 'master_id:', booking.master_id);
          results.push({ bookingId: booking.id, error: 'Missing master data' });
          continue;
        }

        const chatUrl = `https://stellawei.org/chat/${booking.id}`;

        // 给用户发邮件
        console.log(`[reminder] Sending user email to: ${userData.email}`);
        const userEmailResult = await sendConsultationReminder({
          to: userData.email,
          userName: userData.full_name || 'User',
          masterName: masterData.display_name,
          serviceName: booking.service_id,
          scheduledDate: booking.scheduled_date,
          scheduledTime: booking.scheduled_time,
          timezone: booking.timezone || 'Asia/Shanghai',
          isMaster: false,
          chatUrl,
        });
        console.log(`[reminder] User email result:`, userEmailResult);

        // 给师傅发邮件
        console.log(`[reminder] Sending master email to: ${masterData.email}`);
        const masterEmailResult = await sendConsultationReminder({
          to: masterData.email,
          userName: userData.full_name || 'User',
          masterName: masterData.display_name,
          serviceName: booking.service_id,
          scheduledDate: booking.scheduled_date,
          scheduledTime: booking.scheduled_time,
          timezone: booking.timezone || 'Asia/Shanghai',
          isMaster: true,
          chatUrl,
        });
        console.log(`[reminder] Master email result:`, masterEmailResult);

        // 标记已发送
        if (userEmailResult.success || masterEmailResult.success) {
          await supabase
            .from('bookings')
            .update({ reminder_sent: true })
            .eq('id', booking.id);
        }

        results.push({
          bookingId: booking.id,
          userEmail: userEmailResult.success,
          masterEmail: masterEmailResult.success,
          userError: userEmailResult.error,
          masterError: masterEmailResult.error,
        });
      } catch (err) {
        console.error('Failed to send reminder for booking:', booking.id, err);
        results.push({
          bookingId: booking.id,
          error: (err as Error).message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      checked: upcomingBookings.length,
      results,
    });
  } catch (error: any) {
    console.error('Reminder API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
