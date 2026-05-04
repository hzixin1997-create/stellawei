'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Mail, LogOut, MessageSquare, Calendar, CheckCircle, Clock, AlertCircle, Send, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

const MASTER_EMAILS: Record<string, { slug: string; name: string }> = {
  'qimenyihua@gmail.com': { slug: 'zhang-yihua', name: '张易桦师傅' },
  'mshoucangjia@gmail.com': { slug: 'wu-yang', name: '戊阳师傅' },
}

type Order = {
  id: string
  order_number: string
  status: string
  service_name: string
  user_email: string
  amount: number
  currency: string
  created_at: string
  type: string
  messages?: Message[]
}

type Message = {
  id: string
  content: string
  reply: string | null
  status: string
  created_at: string
  updated_at: string
}

export default function MasterDashboardPage() {
  const [masterEmail, setMasterEmail] = useState<string | null>(null)
  const [masterSlug, setMasterSlug] = useState<string | null>(null)
  const [masterName, setMasterName] = useState<string | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginError, setLoginError] = useState('')

  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [ordersError, setOrdersError] = useState('')

  const [activeTab, setActiveTab] = useState<'orders' | 'messages'>('orders')
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyingOrderId, setReplyingOrderId] = useState<string | null>(null)
  const [replyLoading, setReplyLoading] = useState(false)
  const [replySuccess, setReplySuccess] = useState('')

  // 初始化：检查 localStorage 登录状态
  useEffect(() => {
    const saved = localStorage.getItem('master_email')
    if (saved && MASTER_EMAILS[saved]) {
      setMasterEmail(saved)
      setMasterSlug(MASTER_EMAILS[saved].slug)
      setMasterName(MASTER_EMAILS[saved].name)
    }
  }, [])

  // 登录
  const handleLogin = () => {
    const email = loginEmail.trim().toLowerCase()
    if (!MASTER_EMAILS[email]) {
      setLoginError('邮箱不在师傅列表中')
      return
    }
    setLoginError('')
    setMasterEmail(email)
    setMasterSlug(MASTER_EMAILS[email].slug)
    setMasterName(MASTER_EMAILS[email].name)
    localStorage.setItem('master_email', email)
  }

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('master_email')
    setMasterEmail(null)
    setMasterSlug(null)
    setMasterName(null)
    setOrders([])
    setExpandedOrderId(null)
    setReplyText('')
  }

  // 获取订单列表
  const fetchOrders = useCallback(async () => {
    if (!masterSlug) return
    setLoadingOrders(true)
    setOrdersError('')
    try {
      const res = await fetch(`/api/orders?master_slug=${masterSlug}&limit=50`)
      const data = await res.json()
      if (!res.ok) {
        setOrdersError(data.error || '获取订单失败')
        return
      }
      setOrders(data.orders || [])
    } catch (err: any) {
      setOrdersError(err.message || '网络错误')
    } finally {
      setLoadingOrders(false)
    }
  }, [masterSlug])

  useEffect(() => {
    if (masterSlug) {
      fetchOrders()
    }
  }, [masterSlug, fetchOrders])

  // 提交回复
  const handleReplySubmit = async (orderId: string) => {
    if (!replyText.trim()) return
    setReplyLoading(true)
    setReplySuccess('')
    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          reply: replyText.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '回复失败')
        return
      }
      setReplySuccess('回复已提交')
      setReplyText('')
      setReplyingOrderId(null)
      // 刷新订单列表
      await fetchOrders()
      setTimeout(() => setReplySuccess(''), 3000)
    } catch (err: any) {
      alert(err.message || '网络错误')
    } finally {
      setReplyLoading(false)
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: '待付款', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      paid: { label: '已付款', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      assigned: { label: '待回复', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      completed: { label: '已完成', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-600', icon: Clock },
    }
    const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-600', icon: Clock }
    const Icon = s.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {s.label}
      </span>
    )
  }

  // ========== 登录界面 ==========
  if (!masterEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-serif font-bold text-stone-900">Stellawei 师傅后台</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                师傅邮箱
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="输入您的邮箱地址"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 outline-none transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {loginError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition-colors"
            >
              登录
            </button>
          </div>

          <p className="text-xs text-stone-400 text-center mt-4">
            仅限张易桦师傅和戊阳师傅使用
          </p>
        </div>
      </div>
    )
  }

  // ========== 师傅后台主界面 ==========
  const pendingMessages = orders.filter(
    (o) => o.messages && o.messages.some((m) => m.status === 'pending' || !m.reply)
  )
  const repliedMessages = orders.filter(
    (o) => o.messages && o.messages.some((m) => m.status === 'replied' || m.reply)
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-serif font-bold text-stone-900">Stellawei</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-600 font-medium">{masterName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            订单 ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'bg-amber-700 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-1" />
            留言 ({pendingMessages.length} 待回复)
          </button>
        </div>

        {replySuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-green-700 text-sm">
            {replySuccess}
          </div>
        )}

        {/* 订单列表 */}
        {activeTab === 'orders' && (
          <div>
            {loadingOrders && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
                <span className="ml-2 text-stone-500">加载中...</span>
              </div>
            )}
            {ordersError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {ordersError}
              </div>
            )}
            {!loadingOrders && orders.length === 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
                <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500">暂无订单</p>
              </div>
            )}
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-semibold text-stone-900">
                          {order.order_number || order.id.slice(0, 8)}
                        </span>
                        {statusBadge(order.status)}
                      </div>
                      <p className="text-sm text-stone-600">{order.service_name}</p>
                      <p className="text-xs text-stone-400 mt-1">
                        用户: {order.user_email} · {new Date(order.created_at).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-lg font-bold text-amber-700">
                        ${order.amount}
                      </span>
                      <p className="text-xs text-stone-400">{order.currency}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 留言列表 */}
        {activeTab === 'messages' && (
          <div>
            {loadingOrders && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
                <span className="ml-2 text-stone-500">加载中...</span>
              </div>
            )}

            {/* 待回复 */}
            {!loadingOrders && pendingMessages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  待回复留言
                </h3>
                <div className="space-y-3">
                  {pendingMessages.map((order) => {
                    const msg = order.messages?.[0]
                    const isExpanded = expandedOrderId === order.id
                    const isReplying = replyingOrderId === order.id
                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-orange-200 p-5"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-stone-900">
                                {order.order_number || order.id.slice(0, 8)}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                <AlertCircle className="w-3 h-3" />
                                待回复
                              </span>
                            </div>
                            <p className="text-xs text-stone-400 mt-1">
                              用户: {order.user_email}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setExpandedOrderId(isExpanded ? null : order.id)
                              setReplyingOrderId(isReplying ? null : order.id)
                            }}
                            className="text-sm text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" /> 收起
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" /> 查看并回复
                              </>
                            )}
                          </button>
                        </div>

                        {isExpanded && msg && (
                          <div className="mt-3 pt-3 border-t border-stone-100">
                            <div className="bg-stone-50 rounded-xl p-4 mb-3">
                              <p className="text-xs text-stone-400 mb-1">用户提问</p>
                              <p className="text-sm text-stone-800 whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {isReplying && (
                              <div className="space-y-3">
                                <textarea
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  placeholder="输入您的回复..."
                                  rows={6}
                                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 outline-none transition-colors resize-none text-sm"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleReplySubmit(order.id)}
                                    disabled={replyLoading || !replyText.trim()}
                                    className="px-4 py-2 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                  >
                                    {replyLoading ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Send className="w-4 h-4" />
                                    )}
                                    {replyLoading ? '提交中...' : '提交回复'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingOrderId(null)
                                      setReplyText('')
                                    }}
                                    className="px-4 py-2 bg-white text-stone-600 border border-stone-200 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 已回复 */}
            {!loadingOrders && repliedMessages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
                  已回复留言
                </h3>
                <div className="space-y-3">
                  {repliedMessages.map((order) => {
                    const msg = order.messages?.[0]
                    const isExpanded = expandedOrderId === order.id
                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-2xl border border-stone-200 p-5 opacity-80"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-stone-900">
                                {order.order_number || order.id.slice(0, 8)}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <CheckCircle className="w-3 h-3" />
                                已回复
                              </span>
                            </div>
                            <p className="text-xs text-stone-400 mt-1">
                              用户: {order.user_email}
                            </p>
                          </div>
                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="text-sm text-stone-500 hover:text-stone-700 font-medium flex items-center gap-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4" /> 收起
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" /> 查看
                              </>
                            )}
                          </button>
                        </div>

                        {isExpanded && msg && (
                          <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">
                            <div className="bg-stone-50 rounded-xl p-4">
                              <p className="text-xs text-stone-400 mb-1">用户提问</p>
                              <p className="text-sm text-stone-800 whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                              <p className="text-xs text-amber-600 mb-1">您的回复</p>
                              <p className="text-sm text-stone-800 whitespace-pre-wrap">{msg.reply}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!loadingOrders && pendingMessages.length === 0 && repliedMessages.length === 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
                <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <p className="text-stone-500">暂无留言</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
