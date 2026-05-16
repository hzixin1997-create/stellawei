'use client';

import { useState, useEffect } from 'react';
// v2
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Inbox, CheckCircle, Clock, AlertCircle, Video, MessageSquare, ArrowLeft, Loader2, UserCheck } from 'lucide-react';

interface BookingOrder {
  id: string;
  status: string;
  payment_status: string;
  service_category: string;
  consultation_type: string;
  tier: string;
  scheduled_at: string;
  scheduled_time: string;
  duration_text: string;
  total_amount: number;
  currency: string;
  is_first_time: boolean;
  created_at: string;
  user_id: string;
}

interface MessageOrder {
  id: string;
  status: string;
  service_name: string;
  amount: number;
  currency: string;
  user: { full_name?: string; email?: string };
  created_at: string;
  user_question?: string;
  master_response?: string;
  master_read: boolean;
}

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '待付款', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  paid: { label: '已付款', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  confirmed: { label: '已接单', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  in_progress: { label: '进行中', color: 'bg-purple-100 text-purple-800', icon: Video },
  completed: { label: '已完成', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
  refund_requested: { label: '退款申请', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  refunded: { label: '已退款', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
};

const categoryMap: Record<string, string> = {
  tarot: '塔罗占卜',
  eastern: '东方占卜',
  spiritual: '灵性探索',
};

const tierMap: Record<string, string> = {
  first: '首单',
  basic: '基础',
  deep: '深度',
  fengshui: '风水专项',
};

export default function MasterOrdersPage() {
  const supabase = createClient();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'message' | 'realtime'>('message');
  const [loading, setLoading] = useState(true);
  const [messageOrders, setMessageOrders] = useState<MessageOrder[]>([]);
  const [realtimeOrders, setRealtimeOrders] = useState<BookingOrder[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/master/login');
        return;
      }

      // 获取师傅 ID
      const { data: master } = await supabase
        .from('masters')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!master) return;

      // 查留言订单（orders 表）
      const res = await fetch(`/api/master/orders?limit=100`, {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.orders) {
        setMessageOrders(data.orders);
      }

      // 查实时咨询订单（bookings 表）
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('master_id', master.id)
        .eq('consultation_type', 'realtime')
        .order('created_at', { ascending: false });

      if (bookings) {
        setRealtimeOrders(bookings);
      }
    } catch (err) {
      console.error('Orders load error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 接单
  const handleAccept = async (bookingId: string) => {
    if (!confirm('确认接单？接单后请准时参加咨询。')) return;
    setAcceptingId(bookingId);
    try {
      const res = await fetch('/api/master/accept-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '接单失败');
      }
      // 更新本地状态
      setRealtimeOrders(prev =>
        prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b)
      );
      alert('接单成功！');
    } catch (err: any) {
      alert(`接单失败: ${err.message}`);
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-stone-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/master/dashboard" className="inline-flex items-center text-stone-600 hover:text-stone-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回首页
          </Link>
          <h1 className="text-3xl font-serif font-bold text-stone-900">订单管理</h1>
          <p className="text-stone-600 mt-2">管理您的留言咨询和实时咨询订单</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('message')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'message'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <MessageSquare size={16} />
            留言咨询 ({messageOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('realtime')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'realtime'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Video size={16} />
            实时咨询 ({realtimeOrders.length})
          </button>
        </div>

        {/* 留言咨询订单 */}
        {activeTab === 'message' && (
          <div className="space-y-4">
            {messageOrders.length === 0 ? (
              <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400">
                <Inbox size={48} className="mx-auto mb-3 opacity-50" />
                <p>暂无留言订单</p>
              </div>
            ) : (
              messageOrders.map((order) => {
                const status = statusMap[order.status] || statusMap.pending;
                const Icon = status.icon;
                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status.color} flex-shrink-0`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-stone-900">{order.service_name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                          {!order.master_read && order.user_question && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                              新消息
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-stone-600">
                          {order.user?.full_name || order.user?.email || '匿名用户'} · {order.currency} {order.amount}
                        </p>
                        {order.user_question && !order.master_response && (
                          <p className="text-xs text-orange-600 mt-2">⚠️ 等待您的回复</p>
                        )}
                        <p className="text-xs text-stone-400 mt-1">
                          {new Date(order.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Link href={`/master/orders/${order.id}`}>
                          <button className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                            查看详情
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 实时咨询订单 */}
        {activeTab === 'realtime' && (
          <div className="space-y-4">
            {realtimeOrders.length === 0 ? (
              <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400">
                <Inbox size={48} className="mx-auto mb-3 opacity-50" />
                <p>暂无实时咨询订单</p>
              </div>
            ) : (
              realtimeOrders.map((order) => {
                const status = statusMap[order.status] || statusMap.pending;
                const Icon = status.icon;
                const canAccept = order.payment_status === 'paid' && order.status === 'pending';
                const isConfirmed = order.status === 'confirmed' || order.status === 'in_progress';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border border-stone-200 p-5 hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status.color} flex-shrink-0`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-stone-900">
                            {categoryMap[order.service_category] || order.service_category}
                          </h3>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-stone-100 text-stone-600">
                            {tierMap[order.tier] || order.tier}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-stone-600">
                          {order.duration_text} · {order.currency.toUpperCase()} {order.total_amount}
                        </p>
                        {order.scheduled_at && (
                          <p className="text-sm text-stone-500 mt-1">
                            预约时间: {new Date(order.scheduled_at).toLocaleDateString('zh-CN')} {order.scheduled_time}
                          </p>
                        )}
                        <p className="text-xs text-stone-400 mt-1">
                          用户: {order.user_id?.slice(0, 12)}... · {new Date(order.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {canAccept && (
                          <button
                            onClick={() => handleAccept(order.id)}
                            disabled={acceptingId === order.id}
                            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <UserCheck size={16} />
                            {acceptingId === order.id ? '处理中...' : '接单'}
                          </button>
                        )}
                        {isConfirmed && (
                          <span className="px-4 py-2 text-sm bg-stone-100 text-stone-400 rounded-lg text-center">
                            视频功能即将上线
                          </span>
                        )}
                        {order.payment_status === 'pending' && (
                          <span className="px-4 py-2 text-sm bg-yellow-50 text-yellow-600 rounded-lg text-center">
                            待付款
                          </span>
                        )}
                        {(order.status === 'refund_requested' || order.payment_status === 'refund_requested') && (
                          <span className="px-4 py-2 text-sm bg-orange-50 text-orange-600 rounded-lg text-center">
                            退款申请中
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
