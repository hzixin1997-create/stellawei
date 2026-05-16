import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { MASTER_WHITELIST } from '@/lib/master-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/stats
 * 总裁后台综合统计数据
 */
export async function GET() {
  try {
    // 鉴权：检查是否是管理员（这里简化，实际应该用专门的 admin 白名单）
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 1. 基础统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString();

    // 2. 获取所有 bookings（用 service key 绕过 RLS）
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Admin stats fetch error:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch stats', message: bookingsError.message },
        { status: 500 }
      );
    }

    const bookings = (allBookings || []).filter(b => b.deleted_at === null);

    // 3. 计算统计
    // 有效订单 = 非取消 且 非退款
    const isValidOrder = (b: any) =>
      b.status !== 'cancelled' &&
      b.payment_status !== 'cancelled' &&
      b.payment_status !== 'refunded';

    const todayOrders = bookings.filter(b => isValidOrder(b) && new Date(b.created_at) >= today).length;
    // 总订单 = 已支付 + 已退款（不含取消的）
    const totalOrders = bookings.filter(b =>
      b.payment_status === 'paid' || b.payment_status === 'refunded'
    ).length;
    const refundOrders = bookings.filter(b => b.payment_status === 'refunded');
    const refundCount = refundOrders.length;
    const refundAmount = refundOrders.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    // 估算 Stripe 手续费损失（香港账户：约 3.5% + $0.30）
    const estimateStripeFee = (amount: number) => amount * 0.035 + 0.30;
    const refundFee = refundOrders.reduce((sum, b) => sum + estimateStripeFee(b.total_amount || 0), 0);

    const monthRevenue = bookings
      .filter(b => b.payment_status === 'paid' && new Date(b.created_at) >= monthStart)
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const totalRevenue = bookings
      .filter(b => b.payment_status === 'paid')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);

    // 退款率 = 退款订单数 / 总订单数（已支付或已退款）× 100%
    const totalPaidOrders = bookings.filter(b =>
      b.payment_status === 'paid' || b.payment_status === 'refunded'
    ).length;
    const refundRate = totalPaidOrders > 0 ? ((refundCount / totalPaidOrders) * 100).toFixed(1) : '0.0';

    // 活跃师傅 = 至少有一个 paid/confirmed/in_progress/completed 订单的师傅
    const activeMasters = new Set(
      bookings
        .filter(b =>
          b.payment_status === 'paid' ||
          b.status === 'confirmed' ||
          b.status === 'in_progress' ||
          b.status === 'completed'
        )
        .map(b => b.master_id)
    ).size;

    // 4. 师傅统计
    const masterStats = MASTER_WHITELIST.map(master => {
      const masterBookings = bookings.filter(b => b.master_id === master.slug);
      const masterPaid = masterBookings.filter(b => b.payment_status === 'paid');
      const masterMonth = masterPaid.filter(b => new Date(b.created_at) >= monthStart);

      return {
        id: master.slug,
        name: master.name,
        nameEn: master.name,
        email: master.email,
        specialty: master.specialties.join(' · '),
        specialtyEn: master.specialties.join(' · '),
        totalOrders: masterBookings.length,
        monthOrders: masterMonth.length,
        revenue: masterPaid.reduce((sum, b) => sum + (b.total_amount || 0) * 0.7, 0),
        platformRevenue: masterPaid.reduce((sum, b) => sum + (b.total_amount || 0) * 0.3, 0),
        isOnline: true, // 简化，后续可接入真实在线状态
      };
    });

    // 5. 最近订单（前 10）
    const recentOrders = bookings.slice(0, 10).map(b => ({
      id: b.id,
      user_id: b.user_id,
      master_id: b.master_id,
      service_id: b.service_id,
      status: b.status,
      payment_status: b.payment_status,
      total_amount: b.total_amount,
      scheduled_date: b.scheduled_date,
      scheduled_time: b.scheduled_time,
      created_at: b.created_at,
    }));

    // 6. 交易流水（收入 + 退款）
    const transactions = bookings
      .filter(b => b.payment_status === 'paid' || b.payment_status === 'refunded')
      .map(b => ({
        id: b.id,
        date: b.created_at,
        type: b.payment_status === 'refunded' ? 'refund' : 'income',
        amount: b.total_amount,
        description: `${b.service_id} - ${b.master_id}`,
        status: 'completed',
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      overview: {
        todayOrders,
        totalOrders,
        monthRevenue,
        totalRevenue,
        refundCount,
        refundAmount,
        refundFee,
        refundRate,
        activeMasters: activeMasters || MASTER_WHITELIST.length,
      },
      masterStats,
      recentOrders,
      transactions,
    });
  } catch (error: any) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
