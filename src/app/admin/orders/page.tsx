'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  ShoppingBag,
  Home,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { createClient } from '@/lib/supabase/client';

const mastersMap: Record<string, string> = {
  'master-luna': '卢娜师傅',
  'zhang-yihua': '张易桦',
  'wu-yang': '戊阳',
};

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待付款', color: 'bg-yellow-100 text-yellow-800' },
  expired: { text: '已过期', color: 'bg-gray-100 text-gray-500' },
  paid: { text: '已付款', color: 'bg-green-100 text-green-800' },
  confirmed: { text: '已确认', color: 'bg-blue-100 text-blue-800' },
  in_progress: { text: '服务中', color: 'bg-violet-100 text-violet-800' },
  completed: { text: '已完成', color: 'bg-green-100 text-green-800' },
  cancelled: { text: '已取消', color: 'bg-gray-100 text-gray-800' },
  refund_requested: { text: '退款申请', color: 'bg-orange-100 text-orange-800' },
  refunded: { text: '已退款', color: 'bg-gray-100 text-gray-800' },
};

export default function AdminOrders() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [masterFilter, setMasterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const handleProcessRefund = async (orderId: string) => {
    if (!confirm(isZh ? '确认处理此退款申请？款项将原路退回用户。' : 'Confirm processing this refund? The amount will be returned to the user.')) {
      return;
    }
    setProcessingRefund(orderId);
    try {
      const res = await fetch('/api/admin/process-refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: orderId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Refund failed');
      }

      // 更新本地订单状态
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'refunded', payment_status: 'refunded' } : o));
      alert(isZh ? '退款处理成功' : 'Refund processed successfully');
    } catch (err: any) {
      console.error('Process refund error:', err);
      alert(isZh ? `处理失败: ${err.message}` : `Processing failed: ${err.message}`);
    } finally {
      setProcessingRefund(null);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      alert(isZh ? '请先选择要删除的订单' : 'Please select orders to delete');
      return;
    }
    if (!confirm(isZh ? `确定要删除选中的 ${ids.length} 个订单吗？` : `Are you sure you want to delete ${ids.length} selected orders?`)) {
      return;
    }
    setDeleting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert(isZh ? '请先登录' : 'Please login');
        return;
      }

      const res = await fetch('/api/admin/delete-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ids }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Delete failed');
      }

      // 从本地列表移除已删除的
      setOrders(prev => prev.filter(o => !selectedIds.has(o.id)));
      setSelectedIds(new Set());
      alert(isZh ? `已删除 ${ids.length} 个订单` : `Deleted ${ids.length} orders`);
    } catch (err: any) {
      console.error('Batch delete error:', err);
      alert(isZh ? `删除失败: ${err.message}` : `Delete failed: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  // 手动修改订单状态
  const handleUpdateStatus = async (orderId: string, newStatus: string, newPaymentStatus?: string) => {
    if (!confirm(isZh ? `确认将订单状态改为: ${newStatus}?` : `Confirm changing order status to: ${newStatus}?`)) {
      return;
    }
    setUpdatingStatus(orderId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert(isZh ? '请先登录' : 'Please login');
        return;
      }

      const body: Record<string, string> = { bookingId: orderId, status: newStatus };
      if (newPaymentStatus) body.payment_status = newPaymentStatus;

      const res = await fetch('/api/admin/update-order-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }

      // 更新本地订单状态
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, ...(newPaymentStatus ? { payment_status: newPaymentStatus } : {}) } : o));
      alert(isZh ? '状态更新成功' : 'Status updated successfully');
    } catch (err: any) {
      console.error('Update status error:', err);
      alert(isZh ? `更新失败: ${err.message}` : `Update failed: ${err.message}`);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // 可用的状态选项
  const statusOptions = [
    { value: 'pending', label: '待付款', labelEn: 'Pending' },
    { value: 'confirmed', label: '已确认', labelEn: 'Confirmed' },
    { value: 'in_progress', label: '进行中', labelEn: 'In Progress' },
    { value: 'completed', label: '已完成', labelEn: 'Completed' },
    { value: 'cancelled', label: '已取消', labelEn: 'Cancelled' },
  ];

  const paymentStatusOptions = [
    { value: 'pending', label: '待支付', labelEn: 'Pending' },
    { value: 'paid', label: '已支付', labelEn: 'Paid' },
    { value: 'refunded', label: '已退款', labelEn: 'Refunded' },
  ];

  // 切换选中状态
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/orders?limit=100', {
          headers: { authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          console.error('Admin orders fetch error:', data.error);
        } else if (data.orders) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error('Fetch orders error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchQuery =
      !query ||
      order.id?.toLowerCase().includes(query.toLowerCase()) ||
      order.user_id?.toLowerCase().includes(query.toLowerCase());
    const matchMaster = masterFilter === 'all' || order.master_id === masterFilter;
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'ready' && order.payment_status === 'paid' && order.status === 'confirmed' && order.scheduled_date >= new Date().toISOString().split('T')[0]) ||
      (statusFilter === 'in_progress' && order.status === 'in_progress') ||
      order.payment_status === statusFilter ||
      order.status === statusFilter;
    return matchQuery && matchMaster && matchStatus;
  });

  // 状态筛选计数
  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.payment_status === 'pending').length,
    paid: orders.filter(o => o.payment_status === 'paid' && o.status !== 'refund_requested').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    ready: orders.filter(o => o.payment_status === 'paid' && o.status === 'confirmed' && o.scheduled_date >= new Date().toISOString().split('T')[0]).length, // 待服务：已支付+已确认+未来日期
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length,
    refund_requested: orders.filter(o => o.status === 'refund_requested' || o.payment_status === 'refund_requested').length,
    refunded: orders.filter(o => o.payment_status === 'refunded').length,
  };

  const statusFilterConfig = [
    { key: 'all', label: '全部', labelEn: 'All' },
    { key: 'pending', label: '待付款', labelEn: 'Pending' },
    { key: 'ready', label: '待服务', labelEn: 'Ready' }, // 新增：已支付但未开始
    { key: 'in_progress', label: '进行中', labelEn: 'In Progress' }, // 新增
    { key: 'completed', label: '已完成', labelEn: 'Completed' },
    { key: 'refund_requested', label: '退款申请', labelEn: 'Refund' },
    { key: 'refunded', label: '已退款', labelEn: 'Refunded' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* 顶部导航 — 手机端精简 */}
      <div className="bg-white border-b border-stone-200 px-2 sm:px-4 py-3 md:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-stone-600 hover:text-stone-900 gap-2">
            <Home className="w-5 h-5" />
            <span className="font-medium">{isZh ? '返回首页' : 'Back to Home'}</span>
          </Link>
          <h1 className="text-lg font-bold text-stone-900">{isZh ? '订单管理' : 'Orders'}</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* 桌面端导航 */}
      <div className="hidden md:block bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-stone-600 hover:text-stone-900 gap-2">
            <Home className="w-5 h-5" />
            <span className="font-medium">{isZh ? '返回首页' : 'Back to Home'}</span>
          </Link>
          <h1 className="text-lg font-bold text-stone-900">{isZh ? '订单管理' : 'Order Management'}</h1>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-6 sm:py-8">
        {/* 筛选栏 */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="p-3 sm:p-4 flex flex-col gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder={isZh ? '搜索订单ID或用户ID...' : 'Search order ID or user ID...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-stone-50 border-stone-200 w-full"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={16} className="text-stone-400" />
              <select
                value={masterFilter}
                onChange={(e) => setMasterFilter(e.target.value)}
                className="text-sm border border-stone-200 rounded-md px-3 py-2 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 flex-1 min-w-[120px] sm:flex-none"
              >
                <option value="all">{isZh ? '全部师傅' : 'All Masters'}</option>
                <option value="master-luna">{isZh ? '卢娜师傅' : 'Master Luna'}</option>
                <option value="zhang-yihua">{isZh ? '张易桦' : 'Master Zhang'}</option>
                <option value="wu-yang">{isZh ? '戊阳' : 'Master Wu'}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-stone-200 rounded-md px-3 py-2 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 flex-1 min-w-[120px] sm:flex-none"
              >
                <option value="all">{isZh ? '全部状态' : 'All Status'}</option>
                <option value="pending">{isZh ? '待付款' : 'Pending'}</option>
                <option value="paid">{isZh ? '已付款' : 'Paid'}</option>
                <option value="confirmed">{isZh ? '已确认' : 'Confirmed'}</option>
                <option value="completed">{isZh ? '已完成' : 'Completed'}</option>
                <option value="refund_requested">{isZh ? '退款申请' : 'Refund Requested'}</option>
                <option value="refunded">{isZh ? '已退款' : 'Refunded'}</option>
              </select>
            </div>
            {/* 批量删除按钮 */}
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                onClick={handleBatchDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {deleting
                  ? (isZh ? '删除中...' : 'Deleting...')
                  : (isZh ? `删除选中 (${selectedIds.size})` : `Delete Selected (${selectedIds.size})`)}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 状态筛选标签 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {statusFilterConfig.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                statusFilter === s.key
                  ? 'bg-violet-100 text-violet-700 border-violet-300'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              {isZh ? s.label : s.labelEn}
              <span className={`ml-1.5 text-xs ${statusFilter === s.key ? 'text-violet-500' : 'text-stone-400'}`}>
                ({statusCounts[s.key as keyof typeof statusCounts]})
              </span>
            </button>
          ))}
        </div>

        {/* 订单列表 */}
        <Card>
          <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base font-sans font-semibold">
                {isZh ? '订单列表' : 'Orders'} ({filteredOrders.length})
              </CardTitle>
              {/* 全选 */}
              {filteredOrders.length > 0 && (
                <label className="flex items-center gap-2 text-xs sm:text-sm text-stone-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-stone-300 text-violet-600 focus:ring-violet-500"
                  />
                  {isZh ? '全选' : 'Select All'}
                </label>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-stone-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                {isZh ? '加载中...' : 'Loading...'}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                <p className="text-stone-500 text-lg mb-2">{isZh ? '暂无订单' : 'No orders yet'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-lg p-3 sm:p-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
                      <div className="flex items-start gap-3 flex-1">
                        {/* 复选框 */}
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          className="mt-1 w-4 h-4 rounded border-stone-300 text-violet-600 focus:ring-violet-500 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium">{mastersMap[order.master_id] || order.master_id}</span>
                            {(() => {
                              const isExpiredOrder = order.status === 'pending' && order.payment_status === 'pending' && order.expires_at && Date.now() > new Date(order.expires_at).getTime();
                              const displayStatus = isExpiredOrder ? 'expired' : order.payment_status;
                              return (
                                <Badge className={statusLabels[displayStatus]?.color || 'bg-gray-100'}>
                                  {statusLabels[displayStatus]?.text || displayStatus}
                                </Badge>
                              );
                            })()}
                            <span className="text-xs text-stone-400">{order.id.slice(0, 8)}</span>
                          </div>
                          <p className="text-sm text-stone-600">
                            {order.service_id} · ${order.total_amount}
                            {order.scheduled_date && order.scheduled_time
                              ? ` · ${order.scheduled_date} ${order.scheduled_time}`
                              : order.consultation_type === 'message'
                                ? ' · 留言咨询'
                                : ' · 未预约时间'}
                          </p>
                          <p className="text-xs text-stone-400 mt-1">
                            User: {order.user_id?.slice(0, 12)}... · {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-2 sm:ml-4 sm:justify-start pl-7 sm:pl-0">
                        {/* 状态修改下拉菜单 */}
                        <div className="flex gap-2">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            disabled={updatingStatus === order.id}
                            className="text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          >
                            {statusOptions.map(s => (
                              <option key={s.value} value={s.value}>{isZh ? s.label : s.labelEn}</option>
                            ))}
                          </select>
                          <select
                            value={order.payment_status}
                            onChange={(e) => handleUpdateStatus(order.id, order.status, e.target.value)}
                            disabled={updatingStatus === order.id}
                            className="text-xs border border-stone-200 rounded-md px-2 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                          >
                            {paymentStatusOptions.map(s => (
                              <option key={s.value} value={s.value}>{isZh ? s.label : s.labelEn}</option>
                            ))}
                          </select>
                        </div>
                        {(order.status === 'refund_requested' || order.payment_status === 'refund_requested') && (
                          <Button
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white flex-1 sm:flex-none"
                            onClick={() => handleProcessRefund(order.id)}
                            disabled={processingRefund === order.id}
                          >
                            {processingRefund === order.id
                              ? (isZh ? '处理中...' : 'Processing...')
                              : (isZh ? '处理退款' : 'Process Refund')}
                          </Button>
                        )}
                        {order.status !== 'refund_requested' && order.payment_status !== 'refund_requested' && (
                          <span className="text-xs text-stone-400 whitespace-nowrap">
                            {order.scheduled_date && order.scheduled_time
                              ? `${order.scheduled_date} ${order.scheduled_time}`
                              : order.consultation_type === 'message'
                                ? '留言咨询'
                                : '-'}
                          </span>
                        )}
                      </div>
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
