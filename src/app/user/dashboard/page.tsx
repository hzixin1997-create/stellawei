'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, MessageSquare, ArrowRight, Clock, User, Home, LogOut, MessageCircle, AlertTriangle, Star } from 'lucide-react'
import Link from 'next/link'

import { isConsultationExpired, getConsultationDisplayStatus } from '@/lib/utils'
const masters: Record<string, { name: string; nameCn: string; specialty: string }> = {
  'master-luna': { name: 'Master Luna', nameCn: '卢娜师傅', specialty: 'Tarot' },
  'zhang-yihua': { name: 'Master Zhang Yihua', nameCn: '张易桦', specialty: 'Qi Men Dun Jia' },
  'wu-yang': { name: 'Master Wu Yang', nameCn: '戊阳', specialty: 'BaZi & Feng Shui' },
}

// 服务数据
const services: Record<string, { name: string; nameCn: string }> = {
  tarot: { name: 'Tarot Reading', nameCn: '塔罗占卜' },
  spiritual: { name: 'Spiritual Guidance', nameCn: '灵性指引' },
  qimen: { name: 'Qi Men Dun Jia', nameCn: '奇门遁甲' },
  liuyao: { name: 'Liu Yao Divination', nameCn: '六爻占卜' },
  bazi: { name: 'BaZi Analysis', nameCn: '八字分析' },
  fengshui: { name: 'Feng Shui Consultation', nameCn: '风水咨询' },
}

const PAYMENT_TIMEOUT_MINUTES = 10

interface Booking {
  id: string
  master_id: string
  service_id: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes: number
  status: string
  payment_status: string
  total_amount: number
  currency: string
  is_first_time: boolean
  created_at: string
  expires_at: string | null
  deleted_at?: string | null
}

// 格式化倒计时
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function UserDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isZh, setIsZh] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewTargetBooking, setReviewTargetBooking] = useState<Booking | null>(null)
  const [reviewData, setReviewData] = useState<any>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 倒计时状态：booking_id -> remaining_seconds
  const [countdowns, setCountdowns] = useState<Record<string, number>>({})

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // 计算剩余秒数
  const getRemainingSeconds = (expiresAt: string | null): number => {
    if (!expiresAt) return 0
    const end = new Date(expiresAt).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((end - now) / 1000))
  }

  // 判断订单是否已过期（payment_status=expired 或 expires_at超时的pending订单）
  const isExpired = (booking: Booking): boolean => {
    if (booking.payment_status === 'expired') return true
    if (booking.payment_status !== 'pending' && booking.payment_status !== 'pending_payment') {
      return false
    }
    if (!booking.expires_at) return true  // 旧订单没有expires_at，视为已过期
    return new Date(booking.expires_at).getTime() <= Date.now()
  }

  useEffect(() => {
    const getUserAndBookings = async () => {
      const supabase = createClient()
      
      // 1. 获取用户
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      // 2. 查询用户的 bookings（通过 API 绕过 RLS）
      const { data: { session } } = await supabase.auth.getSession()
      const bookingsRes = await fetch('/api/user/bookings', {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      const bookingsJson = await bookingsRes.json()

      if (bookingsRes.ok && bookingsJson.bookings) {
        const visibleBookings = bookingsJson.bookings.filter((b: any) => !b.deleted_at)
        setBookings(visibleBookings)
        // 初始化倒计时
        const initialCountdowns: Record<string, number> = {}
        visibleBookings.forEach((b: Booking) => {
          if ((b.payment_status === 'pending' || b.payment_status === 'pending_payment') && b.expires_at) {
            initialCountdowns[b.id] = getRemainingSeconds(b.expires_at)
          }
        })
        setCountdowns(initialCountdowns)
      }

      setIsLoading(false)
    }

    getUserAndBookings()
  }, [router])

  // 倒计时 tick
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const next: Record<string, number> = {}
        let hasChanges = false
        Object.entries(prev).forEach(([id, seconds]) => {
          const booking = bookings.find(b => b.id === id)
          if (!booking) return
          const remaining = getRemainingSeconds(booking.expires_at)
          next[id] = remaining
          if (remaining !== seconds) hasChanges = true
        })
        return hasChanges ? next : prev
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [bookings])

  // 状态标签样式
  const getStatusBadge = (booking: Booking) => {
    const displayStatus = getConsultationDisplayStatus(booking)
    const { status, payment_status } = booking
    const expired = isExpired(booking)
    
    if (expired && (payment_status === 'pending' || payment_status === 'pending_payment')) {
      return <Badge variant="outline" className="bg-stone-100 text-stone-400 border-stone-200">{isZh ? '已过期' : 'Expired'}</Badge>
    }
    if (payment_status === 'refund_requested' || status === 'refund_requested') {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">{isZh ? '退款申请中' : 'Refund Requested'}</Badge>
    }
    if (payment_status === 'refunded' || status === 'refunded') {
      return <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">{isZh ? '已退款' : 'Refunded'}</Badge>
    }
    if (payment_status === 'pending' || payment_status === 'pending_payment') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{isZh ? '待支付' : 'Pending Payment'}</Badge>
    }
    if (payment_status === 'paid') {
      if (displayStatus === 'in_progress') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{isZh ? '咨询中' : 'In Progress'}</Badge>
      }
      if (displayStatus === 'confirmed') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{isZh ? '已确认' : 'Confirmed'}</Badge>
      }
      if (displayStatus === 'completed') {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{isZh ? '已完成' : 'Completed'}</Badge>
      }
      return <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">{isZh ? '已支付' : 'Paid'}</Badge>
    }
    if (payment_status === 'failed') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{isZh ? '支付失败' : 'Failed'}</Badge>
    }
    if (status === 'cancelled' || payment_status === 'cancelled') {
      return <Badge variant="outline" className="bg-stone-100 text-stone-500 border-stone-200">{isZh ? '已取消' : 'Cancelled'}</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  // 判断订单是否可以进入聊天（已过期不能进入）
  const canEnterChat = (booking: Booking) => {
    const displayStatus = getConsultationDisplayStatus(booking)
    return booking.payment_status === 'paid' && 
      (displayStatus === 'confirmed' || displayStatus === 'in_progress')
  }

  // 取消订单
  const handleCancel = async (bookingId: string) => {
    if (!confirm(isZh ? '确定要取消这个预约吗？' : 'Are you sure you want to cancel this booking?')) {
      return
    }
    setCancellingId(bookingId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session?.access_token || ''}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Cancel failed')
      }

      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', payment_status: 'cancelled' } : b))
    } catch (err: any) {
      console.error('Cancel error:', err)
      alert(isZh ? `取消失败: ${err.message}` : `Cancel failed: ${err.message}`)
    } finally {
      setCancellingId(null)
    }
  }

  // 申请退款 — 跳转到退款政策页面
  const handleRefund = async (bookingId: string) => {
    router.push(`/refund-policy?booking_id=${bookingId}`)
  }

  // 删除订单（软删除：设置 deleted_at）
  const handleDelete = async (bookingId: string) => {
    if (!confirm(isZh ? '确定要永久删除这条订单记录吗？删除后不可恢复。' : 'Are you sure you want to permanently delete this order? This action cannot be undone.')) {
      return
    }
    setDeletingId(bookingId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${bookingId}/soft-delete`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session?.access_token || ''}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Delete failed')
      }

      // 前端移除
      setBookings(prev => prev.filter(b => b.id !== bookingId))
    } catch (err: any) {
      console.error('Delete error:', err)
      alert(isZh ? `删除失败: ${err.message}` : `Delete failed: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  // 打开评价弹窗
  const openReviewModal = async (booking: Booking) => {
    setReviewTargetBooking(booking)
    setReviewLoading(true)
    setShowReviewModal(true)
    setReviewRating(0)
    setReviewText('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${booking.id}/review`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (res.ok) {
        const json = await res.json()
        setReviewData(json.review)
        if (json.review) {
          setReviewRating(json.review.rating || 0)
          setReviewText(json.review.content || '')
        }
      }
    } catch (err) {
      console.error('Fetch review error:', err)
    } finally {
      setReviewLoading(false)
    }
  }

  // 提交评价
  const handleSubmitReview = async () => {
    if (!reviewTargetBooking || reviewRating === 0) {
      alert(isZh ? '请选择评分' : 'Please select a rating')
      return
    }
    setIsSubmittingReview(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${reviewTargetBooking.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ rating: reviewRating, content: reviewText }),
      })
      if (res.ok) {
        const json = await res.json()
        setReviewData(json.review)
        alert(isZh ? '评价提交成功！' : 'Review submitted!')
      } else {
        const err = await res.json()
        alert(err.error || 'Submit failed')
      }
    } catch (err) {
      console.error('Review submit error:', err)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // 支付订单 — 调用 Stripe checkout
  const handlePay = async (booking: Booking) => {
    if (isExpired(booking)) {
      alert(isZh ? '该订单已过期，请重新预约' : 'This order has expired. Please book again.')
      return
    }
    setPayingId(booking.id)
    try {
      const master = masters[booking.master_id]
      const service = services[booking.service_id]

      const res = await fetch('/api/payment/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          masterId: booking.master_id,
          serviceId: booking.service_id,
          amount: booking.total_amount,
          currency: booking.currency,
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.email,
          masterName: isZh ? master?.nameCn : master?.name,
          serviceName: isZh ? service?.nameCn : service?.name,
          scheduledDate: booking.scheduled_date,
          scheduledTime: booking.scheduled_time,
          isFirstTime: booking.is_first_time,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Payment failed')
      }

      // 跳转到 Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL')
      }
    } catch (err: any) {
      console.error('Pay error:', err)
      alert(isZh ? `支付跳转失败: ${err.message}` : `Payment failed: ${err.message}`)
    } finally {
      setPayingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-stone-600 hover:text-stone-900">
            <Home className="w-5 h-5 mr-2" />
            <span className="font-medium">{isZh ? '返回首页' : 'Back to Home'}</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <User className="w-4 h-4" />
              {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {isZh ? '退出登录' : 'Logout'}
            </button>
          </div>
        </div>
      </div>

      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 欢迎语 */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-stone-900">
              {isZh ? '欢迎回来' : 'Welcome Back'}
            </h1>
            <p className="text-stone-600 mt-2">
              {isZh ? '这里您可以查看所有订单和留言记录' : 'View all your orders and messages here'}
            </p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{isZh ? '我的订单' : 'My Orders'}</p>
                    <p className="text-2xl font-bold">{bookings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{isZh ? '实时咨询' : 'Live Consults'}</p>
                    <p className="text-2xl font-bold">
                      {bookings.filter(b => b.status !== 'cancelled' && b.payment_status !== 'cancelled' && b.payment_status !== 'expired').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 快速操作 */}
          <div className="mb-6">
            <Link href="/booking">
              <Button className="w-full bg-violet-600 hover:bg-violet-700 h-12">
                {isZh ? '发起新的咨询' : 'Start New Consultation'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* 我的订单 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {isZh ? '我的订单' : 'My Orders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-stone-500 mb-4">{isZh ? '暂无订单' : 'No orders yet'}</p>
                  <Link href="/booking">
                    <Button variant="outline" size="sm">
                      {isZh ? '去预约' : 'Book Now'}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const master = masters[booking.master_id] || { name: booking.master_id, nameCn: booking.master_id, specialty: '' }
                    const service = services[booking.service_id] || { name: booking.service_id, nameCn: booking.service_id }
                    const expired = isExpired(booking)
                    const remainingSeconds = countdowns[booking.id] || 0
                    const isUrgent = remainingSeconds > 0 && remainingSeconds <= 180 // 3分钟内
                    return (
                      <div key={booking.id} className="border rounded-lg p-4 hover:bg-stone-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{isZh ? master.nameCn : master.name}</span>
                              {getStatusBadge(booking)}
                            </div>
                            <p className="text-sm text-stone-600 mb-1">
                              {isZh ? service.nameCn : service.name}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-stone-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {booking.scheduled_date} {booking.scheduled_time}
                              </span>
                              <span>{booking.duration_minutes} min</span>
                            </div>
                            <p className="text-sm font-medium text-violet-600 mt-2">
                              ${booking.total_amount}
                              {booking.is_first_time && (
                                <span className="text-xs text-stone-400 ml-2">({isZh ? '首单优惠' : 'First-time'})</span>
                              )}
                            </p>
                            {/* 倒计时显示 */}
                            {(booking.payment_status === 'pending' || booking.payment_status === 'pending_payment') && !expired && remainingSeconds > 0 && (
                              <div className={`flex items-center gap-1 mt-2 text-xs font-mono ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                                {isUrgent && <AlertTriangle className="w-3 h-3" />}
                                <span>
                                  {isZh ? '支付倒计时：' : 'Payment expires in: '}
                                  {formatCountdown(remainingSeconds)}
                                </span>
                                {isUrgent && (
                                  <span className="text-red-500 font-medium ml-1">
                                    {isZh ? '（请尽快完成）' : '(Hurry!)'}
                                  </span>
                                )}
                              </div>
                            )}
                            {expired && (
                              <p className="text-xs text-stone-400 mt-2">
                                {isZh ? '该订单已过期，请重新预约' : 'This order has expired. Please book again.'}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 ml-4 min-w-[80px]">
                            {/* 已完成订单 - 查看历史对话 */}
                            {booking.payment_status === 'paid' && !canEnterChat(booking) && (
                              <>
                                <Link href={`/chat/${booking.id}`} className="inline-flex">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-stone-600 border-stone-300 hover:bg-stone-100 w-full"
                                  >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    {isZh ? '查看历史' : 'View History'}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 w-full"
                                  onClick={() => openReviewModal(booking)}
                                >
                                  <Star className="w-4 h-4 mr-1" />
                                  {isZh ? '查看评价' : 'Review'}
                                </Button>
                              </>
                            )}
                            {/* 进行中订单 - 进入咨询 */}
                            {canEnterChat(booking) && (
                              <Link href={`/chat/${booking.id}`} className="inline-flex">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-violet-600 border-violet-200 hover:bg-violet-50 hover:text-violet-700 w-full"
                                >
                                  <MessageCircle className="w-4 h-4 mr-1" />
                                  {isZh ? '进入咨询' : 'Enter Chat'}
                                </Button>
                              </Link>
                            )}
                            {/* 已支付但非已完成/进行中 - 申请退款 */}
                            {booking.payment_status === 'paid' && canEnterChat(booking) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 w-full"
                                onClick={() => handleRefund(booking.id)}
                                disabled={refundingId === booking.id}
                              >
                                {refundingId === booking.id ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '申请退款' : 'Refund')}
                              </Button>
                            )}

                            {(booking.payment_status === 'pending' || booking.payment_status === 'pending_payment') && !expired && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-amber-500 hover:bg-amber-600 text-white w-full"
                                  onClick={() => handlePay(booking)}
                                  disabled={payingId === booking.id}
                                >
                                  {payingId === booking.id ? (isZh ? '跳转中...' : 'Redirecting...') : (isZh ? '支付' : 'Pay')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 w-full"
                                  onClick={() => handleCancel(booking.id)}
                                  disabled={cancellingId === booking.id}
                                >
                                  {cancellingId === booking.id ? (isZh ? '取消中...' : 'Cancelling...') : (isZh ? '取消' : 'Cancel')}
                                </Button>
                              </>
                            )}
                            {expired && (
                              <>
                                <Link href="/booking" className="inline-flex">
                                  <Button size="sm" variant="outline" className="w-full">
                                    {isZh ? '重新预约' : 'Rebook'}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-stone-500 border-stone-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 w-full"
                                  onClick={() => handleDelete(booking.id)}
                                  disabled={deletingId === booking.id}
                                >
                                  {deletingId === booking.id ? (isZh ? '删除中...' : 'Deleting...') : (isZh ? '删除' : 'Delete')}
                                </Button>
                              </>
                            )}
                            {booking.payment_status === 'failed' && (
                              <Link href={`/order/${booking.id}`} className="inline-flex">
                                <Button size="sm" variant="outline" className="w-full">
                                  {isZh ? '重试' : 'Retry'}
                                </Button>
                              </Link>
                            )}
                            {(booking.status === 'cancelled' || booking.payment_status === 'cancelled') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-stone-500 border-stone-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 w-full"
                                onClick={() => handleDelete(booking.id)}
                                disabled={deletingId === booking.id}
                              >
                                {deletingId === booking.id ? (isZh ? '删除中...' : 'Deleting...') : (isZh ? '删除' : 'Delete')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 我的留言 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {isZh ? '我的留言' : 'My Messages'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-stone-500 mb-4">{isZh ? '暂无留言' : 'No messages yet'}</p>
                <Link href="/consultation-type">
                  <Button variant="outline" size="sm">
                    {isZh ? '去留言' : 'Leave Message'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 评价弹窗 */}
          {showReviewModal && reviewTargetBooking && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold text-center mb-4">
                  {isZh ? '评价本次咨询' : 'Rate this Consultation'}
                </h3>
                <p className="text-stone-500 text-center mb-6">
                  {isZh
                    ? `您对 ${masters[reviewTargetBooking.master_id]?.nameCn || reviewTargetBooking.master_id} 师傅的服务满意吗？`
                    : `How was your experience with ${masters[reviewTargetBooking.master_id]?.name || reviewTargetBooking.master_id}?`}
                </p>

                {reviewLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center gap-2 mb-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none"
                          disabled={reviewData !== null}
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= reviewRating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-stone-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder={isZh ? '写下您的评价（可选）' : 'Write your review (optional)'}
                      className="w-full border rounded-lg p-3 text-sm mb-4 resize-none"
                      rows={4}
                      maxLength={500}
                      disabled={reviewData !== null}
                    />

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowReviewModal(false)
                          setReviewTargetBooking(null)
                          setReviewData(null)
                        }}
                      >
                        {isZh ? '关闭' : 'Close'}
                      </Button>
                      {!reviewData && (
                        <Button
                          className="flex-1 bg-violet-600 hover:bg-violet-700"
                          onClick={handleSubmitReview}
                          disabled={isSubmittingReview}
                        >
                          {isSubmittingReview ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          ) : (
                            isZh ? '提交评价' : 'Submit'
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
