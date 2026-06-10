'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, MessageSquare, ArrowRight, Clock, User, Home, LogOut, MessageCircle, AlertTriangle, Star, Calendar as CalendarIcon } from 'lucide-react'
import { Calendar, zhCN, enUS } from '@/components/ui/calendar'
import Link from 'next/link'

import { isConsultationExpired, getConsultationDisplayStatus, formatBookingTimeDisplay } from '@/lib/utils'
import {
  WeChatBrowserModal,
  isWeChatBrowser,
  isInCooldown,
} from '@/components/stripe/wechat-browser-modal'
const masters: Record<string, { name: string; nameCn: string; specialty: string; timezone: string }> = {
  'master-luna': { name: 'Master Luna', nameCn: '卢娜师傅', specialty: 'Tarot', timezone: 'America/Los_Angeles' },
  'zhang-yihua': { name: 'Master Zhang Yihua', nameCn: '张易桦', specialty: 'Qi Men Dun Jia', timezone: 'Asia/Shanghai' },
  'wu-yang': { name: 'Master Wu Yang', nameCn: '戊阳', specialty: 'BaZi & Feng Shui', timezone: 'Asia/Shanghai' },
}

const TIMEZONE_LABELS: Record<string, { en: string; zh: string }> = {
  'America/Los_Angeles': { en: 'Los Angeles', zh: '洛杉矶' },
  'Asia/Shanghai': { en: 'Beijing', zh: '北京' },
  'Asia/Tokyo': { en: 'Tokyo', zh: '东京' },
  'Asia/Hong_Kong': { en: 'Hong Kong', zh: '香港' },
  'Asia/Singapore': { en: 'Singapore', zh: '新加坡' },
  'America/New_York': { en: 'New York', zh: '纽约' },
  'Europe/London': { en: 'London', zh: '伦敦' },
  'Europe/Paris': { en: 'Paris', zh: '巴黎' },
  'Australia/Sydney': { en: 'Sydney', zh: '悉尼' },
  'UTC': { en: 'UTC', zh: 'UTC' },
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
  consultation_type?: string
  reschedule_notice?: string | null
  reschedule_notice_read?: boolean
  refund_status?: string
  refund_reason?: string
  refund_requested_at?: string
  refund_processed_at?: string
  stripe_refund_id?: string
  scheduled_at?: string
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
  // 语言切换（从 localStorage 读取，与首页统一）
  const [isZh, setIsZh] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language')
      return saved !== 'en'
    }
    return true
  })

  const toggleLanguage = () => {
    const newLang = isZh ? 'en' : 'zh'
    setIsZh(!isZh)
    localStorage.setItem('language', newLang)
    document.cookie = `language=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`
  }
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundInfo, setRefundInfo] = useState<Record<string, any>>({})
  const [payingId, setPayingId] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewTargetBooking, setReviewTargetBooking] = useState<Booking | null>(null)
  const [reviewData, setReviewData] = useState<any>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 修改预约时间弹窗状态
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [showWeChatModal, setShowWeChatModal] = useState(false)
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([])
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [rescheduleSelectedTime, setRescheduleSelectedTime] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)

  // 用户时区设置
  const [userTimezone, setUserTimezone] = useState<string>('')
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)
  const [timezoneInput, setTimezoneInput] = useState('')
  const [savingTimezone, setSavingTimezone] = useState(false)

  // Reschedule 通知弹窗
  const [showNoticeModal, setShowNoticeModal] = useState(false)
  const [noticeBooking, setNoticeBooking] = useState<Booking | null>(null)

  // 倒计时状态：booking_id -> remaining_seconds
  const [countdowns, setCountdowns] = useState<Record<string, number>>({})

  // 我的留言
  const [userMessages, setUserMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedMessageBooking, setSelectedMessageBooking] = useState<any>(null)
  const [selectedMessageHistory, setSelectedMessageHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

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
    // 已取消/已退款的订单不算过期
    if (booking.status === 'cancelled' || booking.status === 'refunded' || booking.payment_status === 'cancelled') {
      return false
    }
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

      // 2. 获取用户 profile（包含 timezone）
      try {
        const { data: profile } = await supabase.from('profiles').select('timezone').eq('id', user.id).single()
        if (profile?.timezone) {
          setUserTimezone(profile.timezone)
        }
      } catch (err) {
        console.error('Fetch profile timezone error:', err)
      }

      // 3. 查询用户的 bookings（通过 API 绕过 RLS）
      const { data: { session } } = await supabase.auth.getSession()
      const bookingsRes = await fetch('/api/user/bookings', {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      const bookingsJson = await bookingsRes.json()

      if (bookingsRes.ok && bookingsJson.bookings) {
        let visibleBookings = bookingsJson.bookings.filter((b: any) => !b.deleted_at)

        // 自动同步 pending 订单的 Stripe 支付状态
        const syncPromises = visibleBookings
          .filter((b: Booking) => b.payment_status === 'pending' || b.payment_status === 'pending_payment')
          .map(async (b: Booking) => {
            try {
              const syncRes = await fetch('/api/sync-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  authorization: `Bearer ${session?.access_token || ''}`,
                },
                body: JSON.stringify({ bookingId: b.id }),
              })
              if (syncRes.ok) {
                const syncJson = await syncRes.json()
                if (syncJson.synced) {
                  console.log('[dashboard] auto-synced booking to paid:', b.id)
                  return { id: b.id, updated: true, payment_status: 'paid', status: 'confirmed' }
                }
              }
            } catch (err) {
              console.error('[dashboard] sync error for booking', b.id, err)
            }
            return null
          })

        const syncResults = await Promise.all(syncPromises)
        const syncedMap = new Map<string, any>()
        syncResults.forEach(r => { if (r) syncedMap.set(r.id, r) })

        // 更新已同步的 booking 状态
        if (syncedMap.size > 0) {
          visibleBookings = visibleBookings.map((b: Booking) => {
            if (syncedMap.has(b.id)) {
              return { ...b, payment_status: 'paid', status: 'confirmed' }
            }
            return b
          })
        }

        setBookings(visibleBookings)
        // 初始化倒计时
        const initialCountdowns: Record<string, number> = {}
        visibleBookings.forEach((b: Booking) => {
          if ((b.payment_status === 'pending' || b.payment_status === 'pending_payment') && b.expires_at) {
            initialCountdowns[b.id] = getRemainingSeconds(b.expires_at)
          }
        })
        setCountdowns(initialCountdowns)

        // 检查是否有未读的 reschedule 通知
        const unreadNotice = visibleBookings.find((b: Booking) => b.reschedule_notice && !b.reschedule_notice_read)
        if (unreadNotice) {
          setNoticeBooking(unreadNotice)
          setShowNoticeModal(true)
        }
      }

      // 3. 拉取我的留言（师傅发来的消息）
      try {
        const msgRes = await fetch('/api/user/messages', {
          headers: { authorization: `Bearer ${session?.access_token || ''}` },
        })
        const msgJson = await msgRes.json()
        if (msgRes.ok && msgJson.messages) {
          setUserMessages(msgJson.messages)
        }
      } catch (err) {
        console.error('Fetch messages error:', err)
      } finally {
        setMessagesLoading(false)
      }

      setIsLoading(false)
    }

    getUserAndBookings()
  }, [router])

  // 获取当前 session token
  const getSessionToken = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  // 打开消息历史弹窗
  const openMessageModal = async (bookingId: string) => {
    const relatedBooking = bookings.find((b: Booking) => b.id === bookingId)
    setSelectedMessageBooking(relatedBooking || { id: bookingId })
    setShowMessageModal(true)
    setHistoryLoading(true)
    try {
      const token = await getSessionToken()
      const res = await fetch(`/api/chat/${bookingId}/messages`, {
        headers: { authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.messages) setSelectedMessageHistory(data.messages)
    } catch (err) {
      console.error('Fetch message history error:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  // 标记 reschedule 通知为已读
  const handleReadNotice = async (bookingId: string) => {
    try {
      const token = await getSessionToken()
      await fetch(`/api/bookings/${bookingId}/read-notice`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, reschedule_notice_read: true } : b))
    } catch (err) {
      console.error('Read notice error:', err)
    } finally {
      setShowNoticeModal(false)
      setNoticeBooking(null)
    }
  }

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

  // 状态标签样式（兼容新旧退款状态）
  const getStatusBadge = (booking: Booking) => {
    const displayStatus = getConsultationDisplayStatus(booking)
    const { status, payment_status, refund_status } = booking
    const expired = isExpired(booking)
    
    if (expired && (payment_status === 'pending' || payment_status === 'pending_payment')) {
      return <Badge variant="outline" className="bg-white/10 text-white/50 border-white/15">{isZh ? '已过期' : 'Expired'}</Badge>
    }
    // 优先使用新的 refund_status 字段
    if (refund_status && refund_status !== 'none') {
      const refundStatusMap: Record<string, { text: string; color: string }> = {
        requested: { text: '退款申请中', color: 'bg-orange-50 text-orange-700 border-orange-500/30' },
        under_review: { text: '审核中', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        approved: { text: '已批准', color: 'bg-blue-50 text-blue-700 border-blue-500/30' },
        rejected: { text: '已拒绝', color: 'bg-red-50 text-red-700 border-red-500/30' },
        processing: { text: '处理中', color: 'bg-blue-50 text-blue-700 border-blue-500/30' },
        refunded: { text: '已退款', color: 'bg-gray-100 text-gray-500 border-gray-200' },
        failed: { text: '退款失败', color: 'bg-red-50 text-red-700 border-red-500/30' },
      }
      const config = refundStatusMap[refund_status] || { text: refund_status, color: 'bg-gray-100 text-gray-500 border-gray-200' }
      return <Badge variant="outline" className={config.color}>{isZh ? config.text : config.text}</Badge>
    }
    // 兼容旧数据
    if (payment_status === 'refund_requested' || status === 'refund_requested') {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-500/30">{isZh ? '退款申请中' : 'Refund Requested'}</Badge>
    }
    if (payment_status === 'refunded' || status === 'refunded') {
      return <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">{isZh ? '已退款' : 'Refunded'}</Badge>
    }
    if (payment_status === 'pending' || payment_status === 'pending_payment') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-500/30">{isZh ? '待支付' : 'Pending Payment'}</Badge>
    }
    if (payment_status === 'paid') {
      if (displayStatus === 'in_progress') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{isZh ? '咨询中' : 'In Progress'}</Badge>
      }
      if (displayStatus === 'upcoming') {
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{isZh ? '即将开始' : 'Upcoming'}</Badge>
      }
      if (displayStatus === 'ended') {
        return <Badge variant="outline" className="bg-white/10 text-white/70 border-white/15">{isZh ? '已结束' : 'Ended'}</Badge>
      }
      if (displayStatus === 'confirmed') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{isZh ? '已确认' : 'Confirmed'}</Badge>
      }
      if (displayStatus === 'completed') {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-500/30">{isZh ? '已完成' : 'Completed'}</Badge>
      }
      return <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-500/30">{isZh ? '已支付' : 'Paid'}</Badge>
    }
    if (payment_status === 'failed') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-500/30">{isZh ? '支付失败' : 'Failed'}</Badge>
    }
    if (status === 'cancelled' || payment_status === 'cancelled') {
      return <Badge variant="outline" className="bg-white/10 text-white/60 border-white/15">{isZh ? '已取消' : 'Cancelled'}</Badge>
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

  // 保存用户时区
  const handleSaveTimezone = async () => {
    if (!timezoneInput.trim()) return
    setSavingTimezone(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ timezone: timezoneInput.trim() }).eq('id', user.id)
        setUserTimezone(timezoneInput.trim())
        setShowTimezoneModal(false)
      }
    } catch (err) {
      console.error('Save timezone error:', err)
      alert(isZh ? '保存失败' : 'Save failed')
    } finally {
      setSavingTimezone(false)
    }
  }

  // 打开修改时间弹窗
  const openRescheduleModal = async (booking: Booking) => {
    setRescheduleBooking(booking)
    setShowRescheduleModal(true)
    setRescheduleDate(booking.scheduled_date)
    setRescheduleSelectedTime('')
    setRescheduleSlots([])
    setRescheduleLoading(true)
    try {
      const masterSlug = booking.master_id
      const res = await fetch(`/api/bookings/occupied-slots?master_id=${masterSlug}&date=${booking.scheduled_date}`)
      const json = await res.json()
      if (res.ok) {
        setRescheduleSlots(json.available_slots || [])
      } else {
        console.error('Fetch slots error:', json.error)
      }
    } catch (err) {
      console.error('Reschedule modal error:', err)
    } finally {
      setRescheduleLoading(false)
    }
  }

  // 日期改变时拉取新时段
  const handleRescheduleDateChange = async (date: string) => {
    setRescheduleDate(date)
    setRescheduleSelectedTime('')
    setRescheduleLoading(true)
    try {
      if (!rescheduleBooking) return
      const masterSlug = rescheduleBooking.master_id
      const res = await fetch(`/api/bookings/occupied-slots?master_id=${masterSlug}&date=${date}`)
      const json = await res.json()
      if (res.ok) {
        setRescheduleSlots(json.available_slots || [])
      } else {
        console.error('Fetch slots error:', json.error)
      }
    } catch (err) {
      console.error('Reschedule date change error:', err)
    } finally {
      setRescheduleLoading(false)
    }
  }

  // 提交修改预约时间
  const handleRescheduleSubmit = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleSelectedTime) {
      alert(isZh ? '请选择日期和时段' : 'Please select date and time')
      return
    }
    setRescheduleSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${rescheduleBooking.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          scheduled_date: rescheduleDate,
          scheduled_time: rescheduleSelectedTime,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        alert(isZh ? '预约时间修改成功！' : 'Booking rescheduled successfully!')
        setBookings(prev => prev.map(b => b.id === rescheduleBooking.id ? { ...b, scheduled_date: rescheduleDate, scheduled_time: rescheduleSelectedTime } : b))
        setShowRescheduleModal(false)
        setRescheduleBooking(null)
      } else {
        const err = await res.json()
        alert(err.error || 'Reschedule failed')
      }
    } catch (err: any) {
      console.error('Reschedule submit error:', err)
      alert(isZh ? `修改失败: ${err.message}` : `Reschedule failed: ${err.message}`)
    } finally {
      setRescheduleSubmitting(false)
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
    // 微信浏览器检测 — 前置拦截
    if (isWeChatBrowser() && !isInCooldown()) {
      setShowWeChatModal(true)
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
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
      {/* 顶部导航 */}
      <div className="bg-black/40 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-white/70 hover:text-white shrink-0">
            <Home className="w-5 h-5 mr-1 sm:mr-2" />
            <span className="font-medium text-sm sm:text-base">{isZh ? '返回首页' : 'Back to Home'}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-white/60 truncate">
              <User className="w-4 h-4 shrink-0" />
              <span className="truncate hidden sm:inline">{user?.email}</span>
            </div>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs sm:text-sm text-white/60 hover:text-violet-300 transition-colors shrink-0"
            >
              <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-xs">
                {isZh ? 'EN' : '中'}
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs sm:text-sm text-white/60 hover:text-red-400 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{isZh ? '退出登录' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 欢迎语 */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-white">
              {isZh ? '欢迎回来' : 'Welcome Back'}
            </h1>
            <p className="text-base text-white/70 mt-2">
              💬 {isZh
                ? '咨询前请添加客服微信号：Stellawei2026，或发送邮件至：support@stellawei.org，以确保咨询能正常进行。'
                : 'Please add our customer service WeChat: Stellawei2026, or email: support@stellawei.org before your consultation to ensure everything goes smoothly.'}
            </p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-violet-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">{isZh ? '我的订单' : 'My Orders'}</p>
                    <p className="text-2xl font-bold text-white">{bookings.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">{isZh ? '实时咨询' : 'Live Consults'}</p>
                    <p className="text-2xl font-bold text-white">
                      {bookings.filter(b => b.status !== 'cancelled' && b.payment_status !== 'cancelled' && b.payment_status !== 'expired').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 账户设置：时区 */}
          <Card className="mb-6 bg-black/40 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">{isZh ? '我的时区' : 'My Timezone'}</p>
                    <p className="text-sm font-medium text-white">{userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTimezoneInput(userTimezone || '')
                    setShowTimezoneModal(true)
                  }}
                >
                  {isZh ? '修改' : 'Change'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <div className="mb-6">
            <Link href="/booking">
              <Button className="w-full bg-violet-600 hover:bg-violet-700 h-12">
                {isZh ? '预约咨询' : 'Book Consultation'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* 我的订单 */}
          <Card className="mb-6 bg-black/40 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShoppingBag className="w-5 h-5" />
                {isZh ? '我的订单' : 'My Orders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/60 mb-4">{isZh ? '暂无订单' : 'No orders yet'}</p>
                  <Link href="/booking">
                    <Button variant="outline" size="sm" className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white">
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
                    const displayStatus = getConsultationDisplayStatus(booking)
                    return (
                      <div key={booking.id} className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-sm sm:text-base truncate text-white">{isZh ? master.nameCn : master.name}</span>
                              {getStatusBadge(booking)}
                            </div>
                            <p className="text-sm text-white/70 mb-1">
                              {isZh ? service.nameCn : service.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-white/60">
                                {booking.consultation_type !== 'message' && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatBookingTimeDisplay(booking)}
                                  </span>
                                )}
                              {booking.consultation_type === 'message' && (
                                <span className="px-2 py-0.5 rounded bg-white/10 text-white/60 text-xs">
                                  {isZh ? '留言咨询' : 'Message'}
                                </span>
                              )}
                              <span>{booking.duration_minutes} min</span>
                            </div>
                            <p className="text-sm font-medium text-violet-300 mt-2">
                              ${booking.total_amount}
                              {booking.is_first_time && (
                                <span className="text-xs text-white/50 ml-2">({isZh ? '首单优惠' : 'First-time'})</span>
                              )}
                            </p>
                            {/* 倒计时显示 */}
                            {(booking.payment_status === 'pending' || booking.payment_status === 'pending_payment') && !expired && remainingSeconds > 0 && (
                              <div className={`flex items-center gap-1 mt-2 text-xs font-mono ${isUrgent ? 'text-red-600' : 'text-amber-300'}`}>
                                {isUrgent && <AlertTriangle className="w-3 h-3" />}
                                <span>
                                  {isZh ? '支付倒计时：' : 'Payment expires in: '}
                                  {formatCountdown(remainingSeconds)}
                                </span>
                                {isUrgent && (
                                  <span className="text-red-400 font-medium ml-1">
                                    {isZh ? '（请尽快完成）' : '(Hurry!)'}
                                  </span>
                                )}
                              </div>
                            )}
                            {expired && (
                              <p className="text-xs text-white/50 mt-2">
                                {isZh ? '该订单已过期，请重新预约' : 'This order has expired. Please book again.'}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap sm:flex-nowrap sm:flex-col gap-2 sm:min-w-[80px]">
                            {/* 已完成订单：查看历史/留言 + 评价 + 删除 */}
                            {displayStatus === 'completed' && booking.payment_status === 'paid' && (
                              <>
                                <Link href={`/chat/${booking.id}`} className="inline-flex flex-1 sm:flex-none">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-white/70 border-white/20 hover:bg-white/10 w-full"
                                  >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    {booking.consultation_type === 'message'
                                      ? (isZh ? '查看留言' : 'View Message')
                                      : (isZh ? '查看历史' : 'View History')}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-300 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-200 flex-1 sm:flex-none"
                                  onClick={() => openReviewModal(booking)}
                                >
                                  <Star className="w-4 h-4 mr-1" />
                                  {isZh ? '评价' : 'Review'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-white/60 border-white/15 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 flex-1 sm:flex-none"
                                  onClick={() => handleDelete(booking.id)}
                                  disabled={deletingId === booking.id}
                                >
                                  {deletingId === booking.id ? (isZh ? '删除中...' : 'Deleting...') : (isZh ? '删除' : 'Delete')}
                                </Button>
                              </>
                            )}
                            {/* 已结束/收尾期：实时咨询（仍可进入聊天） */}
                            {booking.payment_status === 'paid' && displayStatus === 'ended' && booking.consultation_type !== 'message' && (
                              <>
                                <Link href={`/chat/${booking.id}`} className="inline-flex flex-1 sm:flex-none">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200 w-full"
                                  >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    {isZh ? '进入咨询' : 'Enter Chat'}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-300 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-200 flex-1 sm:flex-none"
                                  onClick={() => openReviewModal(booking)}
                                >
                                  <Star className="w-4 h-4 mr-1" />
                                  {isZh ? '评价' : 'Review'}
                                </Button>
                              </>
                            )}
                            {/* 已结束/收尾期：留言咨询 */}
                            {booking.payment_status === 'paid' && displayStatus === 'ended' && booking.consultation_type === 'message' && (
                              <>
                                <Link href={`/chat/${booking.id}`} className="inline-flex flex-1 sm:flex-none">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200 w-full"
                                  >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    {isZh ? '查看留言' : 'View Message'}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-300 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-200 flex-1 sm:flex-none"
                                  onClick={() => openReviewModal(booking)}
                                >
                                  <Star className="w-4 h-4 mr-1" />
                                  {isZh ? '评价' : 'Review'}
                                </Button>
                              </>
                            )}
                            {/* 已确认/即将开始：实时咨询 - 可修改时间 */}
                            {booking.payment_status === 'paid' && (displayStatus === 'confirmed' || displayStatus === 'upcoming') && booking.consultation_type !== 'message' && (
                              <>
                                <Link href={`/chat/${booking.id}`} className="inline-flex flex-1 sm:flex-none">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200 w-full"
                                  >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    {isZh ? '进入咨询' : 'Enter Chat'}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-300 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-200 flex-1 sm:flex-none"
                                  onClick={() => openRescheduleModal(booking)}
                                >
                                  <CalendarIcon className="w-4 h-4 mr-1" />
                                  {isZh ? '修改时间' : 'Reschedule'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-200 flex-1 sm:flex-none"
                                  onClick={() => handleRefund(booking.id)}
                                  disabled={refundingId === booking.id}
                                >
                                  {refundingId === booking.id ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '申请退款' : 'Refund')}
                                </Button>
                              </>
                            )}
                            {/* 进行中：实时咨询 - 不可修改时间 */}
                            {booking.payment_status === 'paid' && displayStatus === 'in_progress' && booking.consultation_type !== 'message' && (
                              <>
                                <Link href={`/chat/${booking.id}`} className="inline-flex flex-1 sm:flex-none">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200 w-full"
                                  >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    {isZh ? '进入咨询' : 'Enter Chat'}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-200 flex-1 sm:flex-none"
                                  onClick={() => handleRefund(booking.id)}
                                  disabled={refundingId === booking.id}
                                >
                                  {refundingId === booking.id ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '申请退款' : 'Refund')}
                                </Button>
                              </>
                            )}
                            {/* 已确认/即将开始：留言咨询 - 可修改时间 */}
                            {booking.payment_status === 'paid' && (displayStatus === 'confirmed' || displayStatus === 'upcoming') && booking.consultation_type === 'message' && (
                              <>
                                <Link href={`/chat/${booking.id}`} className="inline-flex flex-1 sm:flex-none">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200 w-full"
                                  >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    {isZh ? '查看留言' : 'View Message'}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-200 flex-1 sm:flex-none"
                                  onClick={() => handleRefund(booking.id)}
                                  disabled={refundingId === booking.id}
                                >
                                  {refundingId === booking.id ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '申请退款' : 'Refund')}
                                </Button>
                              </>
                            )}
                            {/* 进行中：留言咨询 - 不可修改时间 */}
                            {booking.payment_status === 'paid' && displayStatus === 'in_progress' && booking.consultation_type === 'message' && (
                              <>
                                <Link href={`/chat/${booking.id}`} className="inline-flex flex-1 sm:flex-none">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200 w-full"
                                  >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    {isZh ? '查看留言' : 'View Message'}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-200 flex-1 sm:flex-none"
                                  onClick={() => handleRefund(booking.id)}
                                  disabled={refundingId === booking.id}
                                >
                                  {refundingId === booking.id ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '申请退款' : 'Refund')}
                                </Button>
                              </>
                            )}
                            {/* 已支付但未接单（兜底，旧数据或异常） */}
                            {booking.payment_status === 'paid' && booking.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="text-white/50 border-white/15 bg-white/5 flex-1 sm:flex-none"
                                >
                                  <Clock className="w-4 h-4 mr-1" />
                                  {isZh ? '等待师傅接单' : 'Waiting for Master'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-400 flex-1 sm:flex-none"
                                  onClick={() => handleCancel(booking.id)}
                                  disabled={cancellingId === booking.id}
                                >
                                  {cancellingId === booking.id ? (isZh ? '取消中...' : 'Cancelling...') : (isZh ? '取消' : 'Cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-200 flex-1 sm:flex-none"
                                  onClick={() => handleRefund(booking.id)}
                                  disabled={refundingId === booking.id}
                                >
                                  {refundingId === booking.id ? (isZh ? '处理中...' : 'Processing...') : (isZh ? '申请退款' : 'Refund')}
                                </Button>
                              </>
                            )}
                            {/* 待支付（排除已取消，避免与下方已取消分支同时显示） */}
                            {(booking.payment_status === 'pending' || booking.payment_status === 'pending_payment') && !expired && booking.status !== 'cancelled' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-amber-500 hover:bg-amber-600 text-white flex-1 sm:flex-none"
                                  onClick={() => handlePay(booking)}
                                  disabled={payingId === booking.id}
                                >
                                  {payingId === booking.id ? (isZh ? '跳转中...' : 'Redirecting...') : (isZh ? '支付' : 'Pay')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-400 flex-1 sm:flex-none"
                                  onClick={() => handleCancel(booking.id)}
                                  disabled={cancellingId === booking.id}
                                >
                                  {cancellingId === booking.id ? (isZh ? '取消中...' : 'Cancelling...') : (isZh ? '取消' : 'Cancel')}
                                </Button>
                              </>
                            )}
                            {/* 已过期或已取消订单 */}
                            {(expired || booking.status === 'cancelled' || booking.payment_status === 'cancelled') && (
                              <>
                                <Link href="/booking" className="inline-flex flex-1 sm:flex-none">
                                  <Button size="sm" variant="outline" className="w-full border-white/20 text-white/80 hover:bg-white/10 hover:text-white">
                                    {isZh ? '重新预约' : 'Rebook'}
                                  </Button>
                                </Link>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-white/60 border-white/15 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 flex-1 sm:flex-none"
                                  onClick={() => handleDelete(booking.id)}
                                  disabled={deletingId === booking.id}
                                >
                                  {deletingId === booking.id ? (isZh ? '删除中...' : 'Deleting...') : (isZh ? '删除' : 'Delete')}
                                </Button>
                              </>
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
          <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <MessageSquare className="w-5 h-5" />
                {isZh ? '我的留言' : 'My Messages'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
                </div>
              ) : userMessages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-white/60 mb-4">{isZh ? '暂无留言' : 'No messages yet'}</p>
                  <Link href="/booking">
                    <Button variant="outline" size="sm" className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white">
                      {isZh ? '去预约' : 'Book Now'}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {userMessages.slice(0, 10).map((msg: any) => {
                    const relatedBooking = bookings.find((b: Booking) => b.id === msg.booking_id)
                    const masterName = relatedBooking ? (masters[relatedBooking.master_id]?.nameCn || relatedBooking.master_id) : ''
                    return (
                      <div
                        key={msg.id}
                        className="border border-white/10 rounded-lg p-3 hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => openMessageModal(msg.booking_id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-violet-300">{masterName || msg.sender_name}</span>
                          <span className="text-xs text-white/50">{new Date(msg.created_at).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <p className="text-sm text-white/80 line-clamp-2">{msg.content || (msg.image_url ? '[图片]' : '[语音]')}</p>
                      </div>
                    )
                  })}
                  {userMessages.length > 10 && (
                    <p className="text-center text-xs text-white/50 py-2">
                      {isZh ? `还有 ${userMessages.length - 10} 条消息` : `${userMessages.length - 10} more messages`}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 评价弹窗 */}
          {showReviewModal && reviewTargetBooking && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
              <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-center mb-4">
                  {isZh ? '评价本次咨询' : 'Rate this Consultation'}
                </h3>
                <p className="text-white/60 text-center mb-6">
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
                                : 'text-white/40'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder={isZh ? '写下您的评价（可选）' : 'Write your review (optional)'}
                      className="w-full border border-white/10 rounded-lg p-3 text-sm mb-4 resize-none"
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

          {/* 修改预约时间弹窗 */}
          {showRescheduleModal && rescheduleBooking && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
              <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-center mb-4">
                  {isZh ? '修改预约时间' : 'Reschedule Booking'}
                </h3>
                <p className="text-white/60 text-center mb-2 text-sm">
                  {isZh
                    ? `当前预约：${rescheduleBooking.scheduled_date} ${rescheduleBooking.scheduled_time}`
                    : `Current: ${rescheduleBooking.scheduled_date} ${rescheduleBooking.scheduled_time}`}
                </p>
                <p className="text-white/50 text-center mb-6 text-xs">
                  {isZh
                    ? `师傅时间：${TIMEZONE_LABELS[masters[rescheduleBooking.master_id]?.timezone]?.zh || masters[rescheduleBooking.master_id]?.timezone || ''}`
                    : `Advisor time: ${TIMEZONE_LABELS[masters[rescheduleBooking.master_id]?.timezone]?.en || masters[rescheduleBooking.master_id]?.timezone || ''}`}
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {isZh ? '选择日期' : 'Select Date'}
                  </label>
                  <div className="border border-white/20 rounded-lg p-2 inline-block">
                    <Calendar
                      mode="single"
                      selected={rescheduleDate ? new Date(rescheduleDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          handleRescheduleDateChange(`${year}-${month}-${day}`)
                        }
                      }}
                      locale={isZh ? zhCN : enUS}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const d = new Date(date)
                        d.setHours(0, 0, 0, 0)
                        return d.getTime() < today.getTime()
                      }}
                      className="rounded-md"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    {isZh ? '选择时段' : 'Select Time Slot'}
                  </label>
                  {rescheduleLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-600" />
                    </div>
                  ) : rescheduleSlots.length === 0 ? (
                    <p className="text-sm text-white/50 text-center py-4">
                      {isZh ? '该日期暂无可用时段' : 'No available slots for this date'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {rescheduleSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setRescheduleSelectedTime(slot)}
                          className={`text-xs py-2 px-1 rounded-lg border transition-colors ${
                            rescheduleSelectedTime === slot
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-white text-white/80 border-white/15 hover:border-violet-400 hover:text-violet-300'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowRescheduleModal(false)
                      setRescheduleBooking(null)
                      setRescheduleSelectedTime('')
                    }}
                  >
                    {isZh ? '取消' : 'Cancel'}
                  </Button>
                  <Button
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                    onClick={handleRescheduleSubmit}
                    disabled={rescheduleSubmitting || !rescheduleSelectedTime}
                  >
                    {rescheduleSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      isZh ? '确认修改' : 'Confirm'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Reschedule 通知弹窗 */}
          {showNoticeModal && noticeBooking && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-300" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {isZh ? '预约时间变更' : 'Booking Time Changed'}
                  </h3>
                </div>
                <p className="text-white/70 mb-2">
                  {isZh
                    ? `${masters[noticeBooking.master_id]?.nameCn || noticeBooking.master_id} 师傅调整了您的预约时间：`
                    : `${masters[noticeBooking.master_id]?.name || noticeBooking.master_id} has changed your appointment time:`}
                </p>
                <p className="text-sm text-violet-700 font-medium bg-violet-50 rounded-lg p-3 mb-6">
                  {noticeBooking.reschedule_notice}
                </p>
                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700"
                  onClick={() => handleReadNotice(noticeBooking.id)}
                >
                  {isZh ? '知道了' : 'Got it'}
                </Button>
              </div>
            </div>
          )}

          {/* 查看留言历史弹窗 */}
          {showMessageModal && selectedMessageBooking && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
              <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-center mb-4">
                  {isZh ? '留言记录' : 'Message History'}
                </h3>
                <p className="text-sm text-white/60 text-center mb-4">
                  {isZh
                    ? `${masters[selectedMessageBooking.master_id]?.nameCn || selectedMessageBooking.master_id || '师傅'} 的回复`
                    : `Replies from ${masters[selectedMessageBooking.master_id]?.name || selectedMessageBooking.master_id || 'Master'}`}
                </p>

                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
                  </div>
                ) : selectedMessageHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="w-8 h-8 text-white/40 mx-auto mb-2" />
                    <p className="text-white/60 text-sm">{isZh ? '暂无留言记录' : 'No messages yet'}</p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-4 max-h-[50vh] overflow-y-auto">
                    {selectedMessageHistory.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'master' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                            msg.sender_type === 'master'
                              ? 'bg-white/10 text-white/90 rounded-tl-none'
                              : 'bg-violet-500/20 text-violet-800 rounded-tr-none'
                          }`}
                        >
                          {msg.image_url ? (
                            <img src={msg.image_url} alt="" className="max-w-full rounded-lg" loading="lazy" />
                          ) : msg.audio_url ? (
                            <audio src={msg.audio_url} controls className="w-full" />
                          ) : (
                            <p>{msg.content}</p>
                          )}
                          <p className="text-xs text-white/50 mt-1 text-right">
                            {new Date(msg.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-xs text-white/50 text-center mb-3">
                    {isZh ? '如需继续咨询，请重新下单' : 'To continue consulting, please place a new order'}
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowMessageModal(false)
                      setSelectedMessageBooking(null)
                      setSelectedMessageHistory([])
                    }}
                  >
                    {isZh ? '关闭' : 'Close'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 时区修改弹窗 */}
          {showTimezoneModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
              <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-bold text-center mb-4">
                  {isZh ? '修改时区' : 'Change Timezone'}
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  {isZh ? '请选择您的所在时区' : 'Select your timezone'}
                </p>
                <select
                  value={timezoneInput}
                  onChange={(e) => setTimezoneInput(e.target.value)}
                  className="w-full border border-white/10 rounded-lg p-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                >
                  <option value="">{isZh ? '-- 选择时区 --' : '-- Select timezone --'}</option>
                  <option value="Asia/Shanghai">{isZh ? '中国 (北京/上海)' : 'China (Beijing/Shanghai)'}</option>
                  <option value="Asia/Tokyo">{isZh ? '日本 (东京)' : 'Japan (Tokyo)'}</option>
                  <option value="Asia/Hong_Kong">{isZh ? '中国香港' : 'Hong Kong'}</option>
                  <option value="Asia/Singapore">{isZh ? '新加坡' : 'Singapore'}</option>
                  <option value="America/Los_Angeles">{isZh ? '美国 (洛杉矶)' : 'USA (Los Angeles)'}</option>
                  <option value="America/New_York">{isZh ? '美国 (纽约)' : 'USA (New York)'}</option>
                  <option value="Europe/London">{isZh ? '英国 (伦敦)' : 'UK (London)'}</option>
                  <option value="Europe/Paris">{isZh ? '法国 (巴黎)' : 'France (Paris)'}</option>
                  <option value="Australia/Sydney">{isZh ? '澳大利亚 (悉尼)' : 'Australia (Sydney)'}</option>
                  <option value="UTC">{isZh ? 'UTC' : 'UTC'}</option>
                </select>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowTimezoneModal(false)
                      setTimezoneInput('')
                    }}
                  >
                    {isZh ? '取消' : 'Cancel'}
                  </Button>
                  <Button
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                    onClick={handleSaveTimezone}
                    disabled={savingTimezone || !timezoneInput}
                  >
                    {savingTimezone ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      isZh ? '保存' : 'Save'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

      {/* 微信浏览器支付拦截弹窗 */}
      <WeChatBrowserModal open={showWeChatModal} onClose={() => setShowWeChatModal(false)} />
    </div>
  )
}
