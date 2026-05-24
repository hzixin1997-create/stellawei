'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Loader2,
  Crown,
  Search,
} from 'lucide-react';

const mastersMap: Record<string, { name: string; nameCn: string }> = {
  'master-luna': { name: 'Master Luna', nameCn: '卢娜师傅' },
  'zhang-yihua': { name: 'Master Zhang Yihua', nameCn: '张易桦' },
  'wu-yang': { name: 'Master Wu Yang', nameCn: '戊阳' },
};

const servicesMap: Record<string, { name: string; nameCn: string }> = {
  'tarot-basic': { name: 'Tarot Basic', nameCn: '塔罗基础' },
  'tarot-deep': { name: 'Tarot Deep', nameCn: '塔罗深度' },
  'spiritual-basic': { name: 'Spiritual Basic', nameCn: '灵性基础' },
  'spiritual-deep': { name: 'Spiritual Deep', nameCn: '灵性深度' },
  'bazi-basic': { name: 'BaZi Basic', nameCn: '八字基础' },
  'bazi-deep': { name: 'BaZi Deep', nameCn: '八字深度' },
  'fengshui-special': { name: 'Feng Shui', nameCn: '风水专项' },
};

const statusConfig: Record<string, { text: string; color: string }> = {
  pending: { text: '待付款', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  paid: { text: '已付款', color: 'bg-green-100 text-green-700 border-green-200' },
  confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  in_progress: { text: '进行中', color: 'bg-violet-100 text-violet-700 border-violet-200' },
  completed: { text: '已完成', color: 'bg-stone-100 text-stone-600 border-stone-200' },
  cancelled: { text: '已取消', color: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const paymentStatusConfig: Record<string, { text: string; color: string }> = {
  pending: { text: '未支付', color: 'bg-amber-50 text-amber-600' },
  paid: { text: '已支付', color: 'bg-green-50 text-green-600' },
  expired: { text: '已过期', color: 'bg-gray-50 text-gray-500' },
  refunded: { text: '已退款', color: 'bg-gray-50 text-gray-500' },
  cancelled: { text: '已取消', color: 'bg-gray-50 text-gray-500' },
};

export default function AdminBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterFilter, setMasterFilter] = useState<string>('all');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/auth/login');
          return;
        }

        const res = await fetch('/api/admin/bookings', {
          headers: { authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push('/auth/login');
            return;
          }
          throw new Error('Failed to fetch bookings');
        }

        const data = await res.json();
        setBookings(data.bookings || []);
      } catch (err) {
        console.error('Fetch bookings error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [router]);

  const getMasterInfo = (masterId: string) => {
    return mastersMap[masterId] || { name: masterId, nameCn: masterId };
  };

  const getServiceInfo = (serviceId: string) => {
    return servicesMap[serviceId] || { name: serviceId, nameCn: serviceId };
  };

  const filteredBookings = masterFilter === 'all' 
    ? bookings 
    : bookings.filter((b) => b.master_id === masterFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">预约管理</h1>
          <p className="text-sm text-stone-500 mt-1">
            查看所有师傅的预约订单（按创建时间排序）
          </p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回概览
          </Button>
        </Link>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-stone-400" />
              <select
                value={masterFilter}
                onChange={(e) => setMasterFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">全部师傅</option>
                {Object.entries(mastersMap).map(([id, info]) => (
                  <option key={id} value={id}>{info.nameCn}</option>
                ))}
              </select>
            </div>
            <div className="ml-auto text-sm text-stone-500">
              共 <span className="font-semibold text-stone-900">{filteredBookings.length}</span> 个订单
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
          <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500">暂无预约记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking) => {
            const master = getMasterInfo(booking.master_id);
            const service = getServiceInfo(booking.service_id);
            const status = statusConfig[booking.status] || statusConfig.pending;
            const paymentStatus = paymentStatusConfig[booking.payment_status] || paymentStatusConfig.pending;
            const isMessage = booking.consultation_type === 'message';
            
            return (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-violet-500" />
                        <span className="font-semibold">{master.nameCn}</span>
                        <Badge variant="outline" className={`text-xs ${status.color}`}>
                          {status.text}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${paymentStatus.color}`}>
                          {paymentStatus.text}
                        </Badge>
                        {isMessage && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                            留言
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-stone-600 mb-1">
                        {service.nameCn} · ${booking.total_amount} · {booking.duration_minutes}min
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm text-stone-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {isMessage 
                            ? `创建: ${new Date(booking.created_at).toLocaleDateString('zh-CN')}`
                            : `${booking.scheduled_date || '-'} ${booking.scheduled_time || ''}`
                          }
                        </span>
                        <span>订单: {booking.order_number || booking.id.slice(0, 8)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Link href={`/order/${booking.id}`}>
                        <Button size="sm" variant="outline" className="text-violet-600 border-violet-200 hover:bg-violet-50">
                          查看
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
