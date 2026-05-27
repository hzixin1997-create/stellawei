'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag,
  MessageSquare,
  DollarSign,
  Users,
  UserPlus,
  Wifi,
  Home,
  Loader2,
  RotateCcw,
  AlertTriangle,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { createClient } from '@/lib/supabase/client';

interface StatsData {
  overview: {
    todayOrders: number;
    totalOrders: number;
    monthRevenue: number;
    totalRevenue: number;
    refundCount: number;
    refundAmount: number;
    refundFee: number;
    refundRate: string;
    activeMasters: number;
    totalUsers: number;
    newUsers7d: number;
    onlineUsers: number;
  };
  masterStats: Array<{
    id: string;
    name: string;
    nameEn: string;
    totalOrders: number;
    monthOrders: number;
    revenue: number;
    isOnline: boolean;
  }>;
  recentOrders: Array<{
    id: string;
    master_id: string;
    service_id: string;
    payment_status: string;
    total_amount: number;
    scheduled_date: string | null;
    scheduled_time: string | null;
    consultation_type?: string;
    created_at: string;
  }>;
}

const mastersMap: Record<string, string> = {
  'master-luna': '卢娜师傅',
  'zhang-yihua': '张易桦',
  'wu-yang': '戊阳',
};

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待付款', color: 'bg-yellow-100 text-yellow-800' },
  paid: { text: '已付款', color: 'bg-green-100 text-green-800' },
  confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-800' },
  in_progress: { text: '服务中', color: 'bg-violet-100 text-violet-800' },
  completed: { text: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { text: '已取消', color: 'bg-gray-100 text-gray-800' },
  refund_requested: { text: '退款申请', color: 'bg-orange-100 text-orange-800' },
  refunded: { text: '已退款', color: 'bg-gray-100 text-gray-800' },
};

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingEmails, setConfirmingEmails] = useState(false);
  const [confirmResult, setConfirmResult] = useState<string>('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/stats', {
          headers: { authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();

        if (res.ok && data.overview) {
          setStats(data);
        }
      } catch (err) {
        console.error('Fetch admin stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleConfirmAllEmails = async () => {
    if (!confirm(isZh ? '确认要批量验证所有未确认邮箱的用户吗？' : 'Confirm all unverified emails?')) return;
    setConfirmingEmails(true);
    setConfirmResult('');
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/confirm-all-emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      });
      const data = await res.json();
      if (res.ok) {
        setConfirmResult(isZh ? `成功确认 ${data.confirmed} 个用户${data.failed > 0 ? `，${data.failed} 个失败` : ''}` : `Confirmed ${data.confirmed} users${data.failed > 0 ? `, ${data.failed} failed` : ''}`);
      } else {
        setConfirmResult(isZh ? `失败: ${data.error}` : `Failed: ${data.error}`);
      }
    } catch (err: any) {
      setConfirmResult(isZh ? `错误: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setConfirmingEmails(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  const ov = stats?.overview;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-stone-200 px-2 sm:px-4 py-3 md:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-stone-600 hover:text-stone-900 gap-2">
            <Home className="w-5 h-5" />
            <span className="font-medium">{isZh ? '返回首页' : 'Back to Home'}</span>
          </Link>
          <h1 className="text-lg font-bold text-stone-900">{isZh ? '总裁后台' : 'Admin Dashboard'}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-8 pt-4 sm:pt-8">
        {/* 用户统计卡片 */}
        <h2 className="text-lg font-semibold text-stone-800 mb-4">{isZh ? '用户统计' : 'User Stats'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '总注册用户' : 'Total Users'}</p>
                  <p className="text-2xl font-bold">{ov?.totalUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '7天内新用户' : 'New Users (7d)'}</p>
                  <p className="text-2xl font-bold">{ov?.newUsers7d || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '当前在线' : 'Online Now'}</p>
                  <p className="text-2xl font-bold">{ov?.onlineUsers || 0}</p>
                  <p className="text-xs text-stone-400">{isZh ? '近30分钟活跃' : 'Active 30min'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 一键确认未验证邮箱 */}
        <Card className="mb-8 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-stone-800">{isZh ? '批量确认未验证邮箱' : 'Confirm Unverified Emails'}</p>
                  <p className="text-sm text-stone-500">{isZh ? '解决关闭邮件验证后已有用户无法登录的问题' : 'Fix users stuck after disabling email confirmation'}</p>
                </div>
              </div>
              <button
                onClick={handleConfirmAllEmails}
                disabled={confirmingEmails}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {confirmingEmails ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isZh ? '处理中...' : 'Processing...'}
                  </span>
                ) : (
                  isZh ? '一键确认全部' : 'Confirm All'
                )}
              </button>
            </div>
            {confirmResult && (
              <p className={`mt-3 text-sm ${confirmResult.includes('成功') || confirmResult.includes('Confirmed') ? 'text-green-600' : 'text-red-600'}`}>
                {confirmResult}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 订单统计卡片 */}
        <h2 className="text-lg font-semibold text-stone-800 mb-4">{isZh ? '订单 & 财务' : 'Orders & Finance'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '今日订单' : 'Today Orders'}</p>
                  <p className="text-2xl font-bold">{ov?.todayOrders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '总订单' : 'Total Orders'}</p>
                  <p className="text-2xl font-bold">{ov?.totalOrders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '本月收入' : 'Monthly Revenue'}</p>
                  <p className="text-2xl font-bold">${(ov?.monthRevenue || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '退款订单' : 'Refunded Orders'}</p>
                  <p className="text-2xl font-bold">{ov?.refundCount || 0}</p>
                  <p className="text-xs text-red-500">{isZh ? '退款' : 'Refund'} ${(ov?.refundAmount || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '退款率' : 'Refund Rate'}</p>
                  <p className="text-2xl font-bold">{ov?.refundRate || '0.0'}%</p>
                  <p className="text-xs text-stone-400">{isZh ? '手续费损失' : 'Fee loss'} ${(ov?.refundFee || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '活跃师傅' : 'Active Masters'}</p>
                  <p className="text-2xl font-bold">{ov?.activeMasters || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 最近订单 */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{isZh ? '最近订单' : 'Recent Orders'}</CardTitle>
            <Link href="/admin/orders" className="text-sm text-violet-600 hover:text-violet-700">
              {isZh ? '查看全部 →' : 'View All →'}
            </Link>
          </CardHeader>
          <CardContent>
            {(!stats?.recentOrders || stats.recentOrders.length === 0) ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500">{isZh ? '暂无订单' : 'No orders yet'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{mastersMap[order.master_id] || order.master_id}</p>
                        <p className="text-sm text-stone-500">
                          {order.service_id} · ${order.total_amount}
                          {order.scheduled_date && order.scheduled_time
                            ? ` · ${order.scheduled_date} ${order.scheduled_time}`
                            : order.consultation_type === 'message'
                              ? ' · 留言咨询'
                              : ' · 未预约时间'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusLabels[order.payment_status]?.color || 'bg-gray-100'}>
                        {statusLabels[order.payment_status]?.text || order.payment_status}
                      </Badge>
                      <span className="text-xs text-stone-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
