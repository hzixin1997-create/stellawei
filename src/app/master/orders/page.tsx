'use client';

import { useState, useEffect } from 'react';
// v2
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getConsultationDisplayStatus } from '@/lib/utils';
import { Inbox, CheckCircle, Clock, AlertCircle, Video, MessageSquare, ArrowLeft, Loader2, UserCheck, Star, User, X } from 'lucide-react';

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
  order_number?: string;
  question_text?: string | null;
  expires_at?: string | null;
  review_data?: {
    rating: number;
    content: string | null;
    created_at: string;
  } | null;
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
  expired: { label: '已过期', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
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
  const [messageOrders, setMessageOrders] = useState<BookingOrder[]>([]);
  const [realtimeOrders, setRealtimeOrders] = useState<BookingOrder[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  // 查看历史弹窗（留言咨询）
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBooking, setHistoryBooking] = useState<any>(null);
  const [historyMessages, setHistoryMessages] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // 申请退款
  const [requestingRefundId, setRequestingRefundId] = useState<string | null>(null);

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

      // 使用 API 路由绕过 RLS（师傅身份在服务端验证）
      const res = await fetch('/api/master/bookings', {
        headers: { authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        console.error('Failed to load orders:', res.status);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const bookings = data.bookings || [];

      setMessageOrders(bookings.filter((b: any) => b.consultation_type === 'message'));
      setRealtimeOrders(bookings.filter((b: any) => b.consultation_type === 'realtime'));
    } catch (err) {
      console.error('Load orders error:', err);
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

  // 师傅申请退款
  const handleRequestRefund = async (bookingId: string) => {
    const reason = prompt('请填写退款原因（可选）：', '师傅未及时接单，申请退款');
    if (reason === null) return; // 用户点击取消

    if (!confirm('确认申请退款？此订单将标记为退款申请，等待总裁审批。')) return;

    setRequestingRefundId(bookingId);
    try {
      const res = await fetch('/api/master/request-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '申请退款失败');
      }
      // 更新本地状态
      const updateOrder = (b: BookingOrder) =>
        b.id === bookingId
          ? { ...b, status: 'refund_requested', payment_status: 'refund_requested' }
          : b;
      setRealtimeOrders(prev => prev.map(updateOrder));
      setMessageOrders(prev => prev.map(updateOrder));
      alert('退款申请已提交，等待总裁审批。');
    } catch (err: any) {
      alert(`申请退款失败: ${err.message}`);
    } finally {
      setRequestingRefundId(null);
    }
  };

  // 查看评价
  const openReviewModal = async (order: BookingOrder) => {
    setReviewModalOpen(true);
    setReviewLoading(true);
    setReviewData(null);
    try {
      // 优先使用订单中的 review_data（不额外请求 API）
      if (order.review_data && order.review_data.rating) {
        setReviewData(order.review_data);
        setReviewLoading(false);
        return;
      }
      // fallback：请求 API
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/bookings/${order.id}/review`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      });
      if (res.ok) {
        const json = await res.json();
        setReviewData(json.review);
      }
    } catch (err) {
    } finally {
      setReviewLoading(false);
    }
  };

  // 查看留言历史弹窗
  const openHistoryModal = async (booking: BookingOrder) => {
    setHistoryBooking(booking);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryMessages([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/chat/${booking.id}/messages`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryMessages(data.messages || []);
      }
    } catch (err) {
    } finally {
      setHistoryLoading(false);
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
                const displayStatus = getConsultationDisplayStatus(order);
                const status = statusMap[displayStatus] || statusMap.pending;
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
                          <h3 className="font-semibold text-stone-900">
                            {categoryMap[order.service_category] || order.service_category}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                          {order.question_text && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                              新消息
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mb-1">
                          订单号: {order.order_number || order.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-stone-600">
                          {order.duration_text} · {order.currency.toUpperCase()} {order.total_amount}
                        </p>
                        <p className="text-xs text-stone-400 mt-1">
                          {new Date(order.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => openHistoryModal(order)}
                          className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                        >
                          查看历史
                        </button>
                        {order.payment_status === 'paid' && order.status !== 'refund_requested' && order.status !== 'refunded' && order.status !== 'cancelled' && (
                          <button
                            onClick={() => handleRequestRefund(order.id)}
                            disabled={requestingRefundId === order.id}
                            className="px-4 py-2 text-sm border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50"
                          >
                            {requestingRefundId === order.id ? '处理中...' : '申请退款'}
                          </button>
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
                const displayStatus = getConsultationDisplayStatus(order);
                const status = statusMap[displayStatus] || statusMap.pending;
                const Icon = status.icon;
                const canAccept = order.payment_status === 'paid' && displayStatus === 'pending';
                const isConfirmed = displayStatus === 'confirmed' || displayStatus === 'in_progress';

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
                        <p className="text-xs text-stone-400 mb-1">
                          订单号: {order.order_number || order.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-stone-600">
                          {order.duration_text} · {order.currency.toUpperCase()} {order.total_amount}
                        </p>
                        {order.scheduled_at && (
                          <p className="text-sm text-stone-500 mt-1">
                            预约时间: {new Date(order.scheduled_at?.replace(' ', 'T')?.replace(/([+-]\d{2})$/, '$1:00') || order.scheduled_at).toLocaleDateString('zh-CN')} {order.scheduled_time}
                          </p>
                        )}
                        <p className="text-xs text-stone-400 mt-1">
                          用户: {order.user_id?.slice(0, 12)}... · {new Date(order.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {displayStatus === 'completed' && (
                          <>
                            <Link href={`/chat/${order.id}`}>
                              <button className="px-4 py-2 text-sm bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors text-center w-full">
                                查看历史对话
                              </button>
                            </Link>
                            <button
                              onClick={() => openReviewModal(order)}
                              className="px-4 py-2 text-sm bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-center w-full"
                            >
                              查看评价
                            </button>
                          </>
                        )}
                        {displayStatus === 'completed' && order.review_data && order.review_data.rating && (
                          <div className="flex items-center gap-1 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < (order.review_data?.rating || 0) ? 'fill-amber-400' : 'text-stone-200'}`} />
                            ))}
                            <span className="text-xs ml-1">{order.review_data.rating}/5</span>
                          </div>
                        )}
                        {displayStatus === 'completed' && (
                          <div className="text-xs text-amber-600 font-medium">⭐ 评价功能已上线</div>
                        )}
                        {canAccept && (
                          <>
                            <button
                              onClick={() => handleAccept(order.id)}
                              disabled={acceptingId === order.id}
                              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              <UserCheck size={16} />
                              {acceptingId === order.id ? '处理中...' : '接单'}
                            </button>
                            <button
                              onClick={() => handleRequestRefund(order.id)}
                              disabled={requestingRefundId === order.id}
                              className="px-4 py-2 text-sm border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-100 transition-colors disabled:opacity-50"
                            >
                              {requestingRefundId === order.id ? '处理中...' : '申请退款'}
                            </button>
                          </>
                        )}
                        {isConfirmed && (
                          <Link href={`/chat/${order.id}`}>
                            <button className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-center w-full">
                              进入咨询
                            </button>
                          </Link>
                        )}
                        {displayStatus === 'expired' && (
                          <span className="px-4 py-2 text-sm bg-gray-100 text-gray-500 rounded-lg text-center">
                            已过期
                          </span>
                        )}
                        {order.payment_status === 'pending' && displayStatus !== 'expired' && (
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

        {/* 查看评价弹窗 */}
        {reviewModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">用户评价</h3>
                <button
                  onClick={() => {
                    setReviewModalOpen(false);
                    setReviewData(null);
                  }}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {reviewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                </div>
              ) : reviewData ? (
                <div className="space-y-4">
                  {/* 星级评分 */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-6 h-6 ${
                          i < (reviewData.rating || 0)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-stone-200'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm text-stone-500">
                      {reviewData.rating || 0} / 5
                    </span>
                  </div>

                  {/* 评价内容 */}
                  {reviewData.content ? (
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                      <p className="text-sm text-stone-700 whitespace-pre-wrap">
                        {reviewData.content}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-400 italic">用户未填写文字评价</p>
                  )}

                  {/* 评价时间 */}
                  {reviewData.created_at && (
                    <p className="text-xs text-stone-400">
                      {new Date(reviewData.created_at).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-stone-400 text-sm">暂无评价</p>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setReviewModalOpen(false);
                    setReviewData(null);
                  }}
                  className="px-4 py-2 text-sm bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 查看历史弹窗（留言咨询） */}
        {showHistoryModal && historyBooking && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">查看历史</h3>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryBooking(null);
                    setHistoryMessages([]);
                  }}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 用户问题 */}
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-stone-400" />
                  <span className="text-sm font-medium text-stone-600">用户提问</span>
                </div>
                <p className="text-sm text-stone-700 whitespace-pre-wrap">
                  {historyBooking.question_text || '（无文字描述）'}
                </p>
                {historyBooking.question_images && historyBooking.question_images.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {historyBooking.question_images.map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Question image ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg cursor-pointer border"
                        loading="lazy"
                        onClick={() => window.open(url, '_blank')}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 师傅回复 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-stone-700 mb-2">师傅回复</h4>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                  </div>
                ) : historyMessages.length === 0 ? (
                  <div className="text-center py-8 bg-stone-50 rounded-lg">
                    <p className="text-stone-500 text-sm">暂无回复</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyMessages.map((msg: any) => (
                      <div key={msg.id} className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-violet-700">{msg.sender_name}</span>
                          <span className="text-xs text-violet-400">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-stone-700 whitespace-pre-wrap">{msg.content}</p>
                        {msg.image_url && (
                          <img
                            src={msg.image_url}
                            alt="Reply image"
                            className="mt-2 max-w-full rounded-lg cursor-pointer"
                            loading="lazy"
                            onClick={() => window.open(msg.image_url, '_blank')}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryBooking(null);
                    setHistoryMessages([]);
                  }}
                  className="px-4 py-2 text-sm bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
