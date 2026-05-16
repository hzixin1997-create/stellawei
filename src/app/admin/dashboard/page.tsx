'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag,
  MessageSquare,
  DollarSign,
  Users,
  Home,
  Loader2,
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
    totalRefunds: number;
    activeMasters: number;
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
      <div className="bg-white border-b border-stone-200 px-4 py-3">
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                        <p className="text-sm text-stone-500">{order.service_id} · ${order.total_amount}</p>
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

        {/* 师傅工作量 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats?.masterStats?.map((master) => (
            <Card key={master.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{isZh ? master.name : master.nameEn}</h3>
                  <Badge variant="outline" className="text-green-600">
                    {master.isOnline ? (isZh ? '🟢 在线' : '🟢 Online') : (isZh ? '⚪ 离线' : '⚪ Offline')}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">{isZh ? '订单总量' : 'Total Orders'}</span>
                    <span>{master.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">{isZh ? '本月订单' : 'This Month'}</span>
                    <span>{master.monthOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">{isZh ? '累计收入(70%)' : 'Revenue (70%)'}</span>
                    <span className="font-medium text-violet-600">${master.revenue.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
