'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { getConsultationDisplayStatus, formatBookingTimeDisplay } from '@/lib/utils'
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  Package,
  Home,
  LogOut,
  User,
  ArrowRight,
  MessageCircle,
  MessageSquare,
  Wifi,
  WifiOff,
  Moon,
  Send,
  Loader2,
  X,
  Crown,
  Calendar,
  Star,
  Trash,
} from 'lucide-react'
import Link from 'next/link'
import { SimpleCalendar } from '@/components/SimpleCalendar'

// 服务数据
const services: Record<string, { name: string; nameCn: string }> = {
  tarot: { name: 'Tarot Reading', nameCn: '塔罗占卜' },
  spiritual: { name: 'Spiritual Guidance', nameCn: '灵性指引' },
  qimen: { name: 'Qi Men Dun Jia', nameCn: '奇门遁甲' },
  liuyao: { name: 'Liu Yao Divination', nameCn: '六爻占卜' },
  bazi: { name: 'BaZi Analysis', nameCn: '八字分析' },
  fengshui: { name: 'Feng Shui Consultation', nameCn: '风水咨询' },
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

interface Booking {
  id: string
  master_id: string
  service_id: string
  scheduled_date: string
  scheduled_time: string
  timezone?: string
  scheduled_at?: string
  duration_minutes: number
  status: string
  payment_status: string
  total_amount: number
  currency: string
  user_id: string
  user_email?: string
  user_name?: string
  created_at: string
  expires_at?: string | null
  deleted_at?: string | null
  order_number?: string
  consultation_type?: string
  tier?: string
  question_text?: string | null
  question_images?: string[] | null
}

interface MasterInfo {
  email: string
  name: string
  slug: string
  specialties: string[]
  experience: string
  status: 'online' | 'offline' | 'rest'
}

const statusConfig = {
  online: { label: '在线', labelEn: 'Online', color: 'bg-green-600 text-white border-green-600', icon: Wifi },
  offline: { label: '离线', labelEn: 'Offline', color: 'bg-gray-700 text-white border-gray-700', icon: WifiOff },
  rest: { label: '休息中', labelEn: 'Resting', color: 'bg-orange-600 text-white border-orange-600', icon: Moon },
}

export default function MasterDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [masterInfo, setMasterInfo] = useState<MasterInfo | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<any>(null)
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
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [messageReply, setMessageReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [bookingsPage, setBookingsPage] = useState(1)
  const [bookingsLimit] = useState(10)
  const [hasMoreBookings, setHasMoreBookings] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showCustomerMessageModal, setShowCustomerMessageModal] = useState(false)
  // 查看评价弹窗
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewData, setReviewData] = useState<any>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewTargetBooking, setReviewTargetBooking] = useState<Booking | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerMessageText, setCustomerMessageText] = useState('')
  const [sendingCustomerMessage, setSendingCustomerMessage] = useState(false)
  const [showCustomerHistoryModal, setShowCustomerHistoryModal] = useState(false)
  const [customerMessages, setCustomerMessages] = useState<any[]>([])
  const [customerMessagesLoading, setCustomerMessagesLoading] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyBooking, setHistoryBooking] = useState<any>(null)
  const [historyMessages, setHistoryMessages] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // 取消订单
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelBooking, setCancelBooking] = useState<any>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // 修改时间
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([])
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [rescheduleSelectedTime, setRescheduleSelectedTime] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)

  // 可用时段设置
  const [availableSlots, setAvailableSlots] = useState<string[] | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [savingSlots, setSavingSlots] = useState(false)
  const [syncingMonth, setSyncingMonth] = useState(false)
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState<Date>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow
  })

  // 订单状态筛选
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'refund' | 'message' | 'expired'>('all')

  const ALL_TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '19:00', '19:30', '20:00', '20:30'
  ]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedAvailabilityDate(date)
      setAvailableSlots(null) // 标记为加载中，不显示提示
      loadAvailabilityForDate(date)
    }
  }

  // 加载指定日期的可用时段
  const loadAvailabilityForDate = async (date: Date) => {
    if (!masterInfo) return
    setLoadingSlots(true)
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/master/availability?date=${dateStr}`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (res.ok) {
        const json = await res.json()
        setAvailableSlots(json.available_slots || [])
      }
    } catch (err) {
      console.error('Load availability error:', err)
    } finally {
      setLoadingSlots(false)
    }
  }

  // 加载明天可用时段
  const loadTomorrowAvailability = async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setSelectedAvailabilityDate(tomorrow)
    await loadAvailabilityForDate(tomorrow)
  }

  // 保存指定日期的可用时段
  const saveAvailabilityForDate = async (date: Date, slots: string[]) => {
    if (!masterInfo) return
    setSavingSlots(true)
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/master/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ date: dateStr, available_slots: slots }),
      })
      if (res.ok) {
        setAvailableSlots(slots)
      }
    } catch (err) {
      console.error('Save availability error:', err)
    } finally {
      setSavingSlots(false)
    }
  }

  const toggleSlot = (slot: string) => {
    if (!availableSlots) return
    const newSlots = availableSlots.includes(slot)
      ? availableSlots.filter(s => s !== slot)
      : [...availableSlots, slot].sort()
    saveAvailabilityForDate(selectedAvailabilityDate, newSlots)
  }

  // 加载更多订单
  const loadMoreBookings = async () => {
    if (!user || loadingMore) return
    const nextPage = bookingsPage + 1
    setLoadingMore(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/master/dashboard?page=${nextPage}&limit=${bookingsLimit}`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      const data = await res.json()
      if (res.ok) {
        setBookings(prev => [...prev, ...(data.bookings || [])])
        setBookingsPage(nextPage)
        setHasMoreBookings(data.bookingsPagination?.hasMore || false)
      }
    } catch (err) {
      console.error('Load more bookings error:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  // 刷新可用时段
  const refreshAvailability = async () => {
    if (!masterInfo) return
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    const res = await fetch(`/api/master/availability?date=${dateStr}`, {
      headers: { authorization: `Bearer ${session?.access_token || ''}` },
    })
    if (res.ok) {
      const data = await res.json()
      setAvailableSlots(data.available_slots || [])
    }
  }

  useEffect(() => {
    const getDashboardData = async () => {
      const supabase = createClient()
      
      // 1. 获取用户
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      // 2. 用合并API一次性获取所有数据
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/master/dashboard?page=1&limit=${bookingsLimit}`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      const data = await res.json()

      if (res.ok) {
        if (data.master) {
          setMasterInfo(data.master)
        }
        if (data.bookings) {
          setBookings(data.bookings)
          setHasMoreBookings(data.bookingsPagination?.hasMore || false)
          setBookingsPage(1)
        }
        if (data.customers) {
          setCustomers(data.customers)
        }
        if (data.availability?.available_slots !== undefined) {
          setAvailableSlots(data.availability.available_slots)
        }
        if (data.stats) {
          setStats(data.stats)
        }
      } else {
        console.error('Dashboard API error:', data.error)
      }

      setIsLoading(false)
    }

    getDashboardData()
  }, [router, bookingsLimit])

  // 更新师傅状态
  const updateStatus = async (newStatus: 'online' | 'offline' | 'rest') => {
    if (!masterInfo) return
    setUpdatingStatus(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/master/status', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setMasterInfo({ ...masterInfo, status: newStatus })
      } else {
        alert(isZh ? `更新状态失败: ${data.error}` : `Failed: ${data.error}`)
      }
    } catch (err: any) {
      alert(isZh ? `更新状态失败: ${err.message}` : `Failed: ${err.message}`)
    } finally {
      setUpdatingStatus(false)
    }
  }

  // 保存明天可用时段
  const saveTomorrowAvailability = async (slots: string[]) => {
    if (!masterInfo) return
    setSavingSlots(true)
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/master/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ date: dateStr, available_slots: slots }),
      })
      if (res.ok) {
        setAvailableSlots(slots)
      }
    } catch (err) {
      console.error('Save availability error:', err)
    } finally {
      setSavingSlots(false)
    }
  }

  // 静默保存（不更新当前显示状态，用于批量同步）
  const saveAvailabilitySilent = async (date: Date, slots: string[]) => {
    if (!masterInfo) return;
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/master/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ date: dateStr, available_slots: slots }),
      });
    } catch (err) {
      console.error('Save availability silent error:', err);
    }
  };

  // 同步到本月剩余日期
  const syncToMonth = async () => {
    if (!masterInfo || !availableSlots || availableSlots.length === 0) return;
    setSyncingMonth(true);
    try {
      const year = selectedAvailabilityDate.getFullYear();
      const month = selectedAvailabilityDate.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const currentDay = selectedAvailabilityDate.getDate();
      
      for (let day = currentDay; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        await saveAvailabilitySilent(date, availableSlots);
      }
    } catch (err) {
      console.error('Sync to month error:', err);
    } finally {
      setSyncingMonth(false);
    }
  };

  // 统计（使用 displayStatus 统一判断超时）
  const getDisplayStatus = (b: Booking) => {
    // 只用 scheduled_at（数据库 timestamp with timezone），不用拼接 fallback
    return getConsultationDisplayStatus({
      status: b.status,
      scheduled_at: b.scheduled_at || null,
      duration_minutes: b.duration_minutes || 30,
      expires_at: b.expires_at,
    })
  }

  const visibleBookings = bookings.filter((b) => !b.deleted_at && b.status !== 'cancelled' && b.payment_status !== 'cancelled' && b.payment_status !== 'refunded')

  // 根据筛选条件过滤订单（使用 TimeEngine displayStatus，与 badge 一致）
  const filteredBookings = visibleBookings.filter((b) => {
    if (orderFilter === 'all') return true
    const displayStatus = getDisplayStatus(b)
    if (orderFilter === 'pending') return b.payment_status === 'paid' && (displayStatus === 'confirmed' || displayStatus === 'upcoming')
    if (orderFilter === 'processing') return b.payment_status === 'paid' && displayStatus === 'in_progress'
    if (orderFilter === 'completed') return displayStatus === 'completed' || displayStatus === 'ended'
    if (orderFilter === 'refund') return b.status === 'refund_requested' || b.payment_status === 'refund_requested'
    if (orderFilter === 'message') return b.consultation_type === 'message'
    if (orderFilter === 'expired') return (displayStatus as string) === 'expired' || (b.payment_status === 'paid' && (displayStatus as string) === 'expired')
    return true
  })

  const totalOrders = stats?.total ?? visibleBookings.length
  const pendingOrders = stats?.pending ?? visibleBookings.filter(
    (b) => b.payment_status === 'paid' && (getDisplayStatus(b) === 'confirmed' || getDisplayStatus(b) === 'upcoming')
  ).length
  const processingOrders = stats?.processing ?? visibleBookings.filter(
    (b) => b.payment_status === 'paid' && getDisplayStatus(b) === 'in_progress'
  ).length
  const completedOrders = stats?.completed ?? visibleBookings.filter(
    (b) => getDisplayStatus(b) === 'completed' || getDisplayStatus(b) === 'ended'
  ).length
  const refundOrders = stats?.refund ?? visibleBookings.filter(
    (b) => b.status === 'refund_requested' || b.payment_status === 'refund_requested'
  ).length
  const messageOrders = stats?.message ?? visibleBookings.filter(
    (b) => b.consultation_type === 'message'
  ).length
  const expiredOrders = stats?.expired ?? visibleBookings.filter(
    (b) => getDisplayStatus(b) === 'expired'
  ).length

  const filterConfig = [
    { key: 'all', label: '全部', labelEn: 'All', count: totalOrders },
    { key: 'pending', label: '待服务', labelEn: 'To Service', count: pendingOrders },
    { key: 'processing', label: '进行中', labelEn: 'In Progress', count: processingOrders },
    { key: 'completed', label: '已完成', labelEn: 'Completed', count: completedOrders },
    { key: 'refund', label: '退款申请', labelEn: 'Refund', count: refundOrders },
    { key: 'message', label: '留言', labelEn: 'Message', count: messageOrders },
    { key: 'expired', label: '已过期', labelEn: 'Expired', count: expiredOrders },
  ]

  // 状态标签样式（基于 displayStatus + paymentStatus + status）
  const getStatusBadge = (displayStatus: string, paymentStatus: string, status?: string) => {
    if (status === 'refund_requested' || paymentStatus === 'refund_requested') {
      return (
        <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/30">
          {isZh ? '退款申请' : 'Refund Requested'}
        </Badge>
      )
    }
    if (displayStatus === 'expired' || (paymentStatus === 'pending' && displayStatus === 'expired')) {
      return (
        <Badge variant="outline" className="bg-white/10 text-white/50 border-white/15">
          {isZh ? '已过期' : 'Expired'}
        </Badge>
      )
    }
    if (paymentStatus === 'pending' || paymentStatus === 'pending_payment') {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30">
          {isZh ? '待支付' : 'Pending Payment'}
        </Badge>
      )
    }
    if (paymentStatus === 'paid' && displayStatus === 'pending') {
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30">
          {isZh ? '待接单' : 'Pending Accept'}
        </Badge>
      )
    }
    if (displayStatus === 'confirmed') {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
          {isZh ? '已接单' : 'Confirmed'}
        </Badge>
      )
    }
    if (displayStatus === 'in_progress') {
      return (
        <Badge variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/30">
          {isZh ? '进行中' : 'In Progress'}
        </Badge>
      )
    }
    if (displayStatus === 'completed') {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
          {isZh ? '已完成' : 'Completed'}
        </Badge>
      )
    }
    if (displayStatus === 'cancelled' || paymentStatus === 'cancelled') {
      return (
        <Badge variant="outline" className="bg-white/10 text-white/60 border-white/15">
          {isZh ? '已取消' : 'Cancelled'}
        </Badge>
      )
    }
    if (paymentStatus === 'refunded') {
      return (
        <Badge variant="outline" className="bg-white/10 text-white/50 border-white/15">
          {isZh ? '已退款' : 'Refunded'}
        </Badge>
      )
    }
    return <Badge variant="outline">{displayStatus}</Badge>
  }

  // 接单
  // 删除过期订单
  const handleDeleteExpired = async (bookingId: string) => {
    if (!confirm(isZh ? '确定删除该过期订单？' : 'Delete this expired order?')) return
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${bookingId}/delete`, {
        method: 'POST',
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== bookingId))
        alert(isZh ? '已删除' : 'Deleted')
      } else {
        alert(isZh ? '删除失败' : 'Delete failed')
      }
    } catch (err) {
      alert(isZh ? '删除失败' : 'Delete failed')
    }
  }

  const handleAccept = async (bookingId: string) => {
    if (!confirm(isZh ? '确定要接这个订单吗？' : 'Are you sure you want to accept this order?')) {
      return
    }
    setAcceptingId(bookingId)
    try {
      const res = await fetch('/api/master/accept-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Accept failed')
      }
      // 刷新本地状态
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId ? { ...b, status: 'confirmed' } : b
        )
      )
    } catch (err: any) {
      alert(isZh ? `接单失败: ${err.message}` : `Accept failed: ${err.message}`)
    } finally {
      setAcceptingId(null)
    }
  }

  // 修改预约时间
  // 查看评价
  const loadReview = async (booking: any) => {
    setReviewTargetBooking(booking)
    setShowReviewModal(true)
    setReviewLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${booking.id}/review`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (res.ok) {
        const json = await res.json()
        setReviewData(json.review || null)
      } else {
        setReviewData(null)
      }
    } catch (err) {
      console.error('Load review error:', err)
      setReviewData(null)
    } finally {
      setReviewLoading(false)
    }
  }

  const openRescheduleModal = async (booking: any) => {
    setRescheduleBooking(booking)
    setShowRescheduleModal(true)
    setRescheduleDate(booking.scheduled_date || new Date().toISOString().split('T')[0])
    setRescheduleSelectedTime('')
    setRescheduleSlots([])
    setRescheduleLoading(true)
    try {
      const res = await fetch(`/api/bookings/occupied-slots?master_id=${booking.master_id}&date=${booking.scheduled_date || new Date().toISOString().split('T')[0]}`)
      const json = await res.json()
      if (res.ok) {
        setRescheduleSlots(json.available_slots || [])
      }
    } catch (err) {
      console.error('Reschedule modal error:', err)
    } finally {
      setRescheduleLoading(false)
    }
  }

  const handleRescheduleDateChange = async (date: string) => {
    setRescheduleDate(date)
    setRescheduleSelectedTime('')
    setRescheduleLoading(true)
    try {
      if (!rescheduleBooking) return
      const res = await fetch(`/api/bookings/occupied-slots?master_id=${rescheduleBooking.master_id}&date=${date}`)
      const json = await res.json()
      if (res.ok) {
        setRescheduleSlots(json.available_slots || [])
      }
    } catch (err) {
      console.error('Reschedule date change error:', err)
    } finally {
      setRescheduleLoading(false)
    }
  }

  const handleRescheduleSubmit = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleSelectedTime) {
      alert(isZh ? '请选择日期和时段' : 'Please select date and time')
      return
    }
    setRescheduleSubmitting(true)
    try {
      const res = await fetch('/api/master/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: rescheduleBooking.id,
          scheduled_date: rescheduleDate,
          scheduled_time: rescheduleSelectedTime,
        }),
      })
      if (res.ok) {
        alert(isZh ? '预约时间修改成功！已通知用户。' : 'Booking rescheduled successfully! User has been notified.')
        setBookings((prev) =>
          prev.map((b) =>
            b.id === rescheduleBooking.id
              ? { ...b, scheduled_date: rescheduleDate, scheduled_time: rescheduleSelectedTime }
              : b
          )
        )
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

  // 给客户发消息
  // 查看客户历史消息
  const handleViewCustomerMessages = async (customer: any) => {
    setSelectedCustomer(customer)
    setShowCustomerHistoryModal(true)
    setCustomerMessagesLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/master/messages?user_id=${customer.user.id}`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      const data = await res.json()
      if (res.ok) {
        setCustomerMessages(data.messages || [])
      } else {
      }
    } catch (err) {
    } finally {
      setCustomerMessagesLoading(false)
    }
  }

  // 给客户发消息（从客户列表）
  const handleSendCustomerMessage = async () => {
    if (!selectedCustomer || !customerMessageText.trim()) return
    const bookingId = selectedCustomer.bookings?.[0]?.id
    if (!bookingId) {
      alert(isZh ? '该客户没有可发送的订单' : 'No available booking for this customer')
      return
    }
    setSendingCustomerMessage(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/master/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ bookingId, content: customerMessageText.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Send failed')
      }
      alert(isZh ? '消息已发送' : 'Message sent')
      setCustomerMessageText('')
      setShowCustomerMessageModal(false)
      setSelectedCustomer(null)
    } catch (err: any) {
      alert(isZh ? `发送失败: ${err.message}` : `Send failed: ${err.message}`)
    } finally {
      setSendingCustomerMessage(false)
    }
  }

  // 回复留言咨询
  const handleReplyMessage = async () => {
    if (!selectedBooking || !messageReply.trim()) return
    setSendingReply(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/master/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ bookingId: selectedBooking.id, content: messageReply.trim(), message_source: 'order_reply' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Reply failed')
      }
      alert(isZh ? '回复已发送' : 'Reply sent')
      setMessageReply('')
      setShowMessageModal(false)
      setSelectedBooking(null)
    } catch (err: any) {
      alert(isZh ? `回复失败: ${err.message}` : `Reply failed: ${err.message}`)
    } finally {
      setSendingReply(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  const currentStatus = masterInfo?.status || 'online'
  const statusInfo = statusConfig[currentStatus]
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
      {/* 顶部导航 */}
      <div className="bg-black/40 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-white/70 hover:text-white shrink-0">
            <Home className="w-5 h-5 mr-1 sm:mr-2" />
            <span className="font-medium text-sm sm:text-base">{isZh ? '返回首页' : 'Back to Home'}</span>
          </Link>
          <h1 className="text-sm sm:text-lg font-bold text-white absolute left-1/2 -translate-x-1/2 hidden sm:block">
            {isZh ? '师傅后台' : 'Master Dashboard'}
          </h1>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-xs sm:text-sm text-white/60 hover:text-white transition-colors shrink-0"
            >
              <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-xs">
                {isZh ? 'EN' : '中'}
              </span>
              <span className="hidden sm:inline">{isZh ? 'EN / 中' : 'EN / 中'}</span>
            </button>
            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-white/60 truncate">
              <User className="w-4 h-4 shrink-0" />
              <span className="truncate hidden sm:inline">{user?.email}</span>
            </div>
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
          {/* 欢迎语 + 状态控制 + 钱包 */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xl sm:text-3xl font-serif font-bold text-white truncate">
                  {isZh
                    ? `欢迎回来，${masterInfo?.name || ''}师傅`
                    : `Welcome Back, ${masterInfo?.name || ''}`}
                </h1>
                <Badge variant="outline" className={`flex items-center gap-1 shrink-0 text-xs sm:text-sm ${statusInfo.color}`}>
                  <StatusIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">{isZh ? statusInfo.label : statusInfo.labelEn}</span>
                  <span className="sm:hidden">{isZh ? statusInfo.label : statusInfo.labelEn}</span>
                </Badge>
              </div>
              {/* 钱包图标 + 累计收入 */}
              <div className="sm:ml-auto flex items-center gap-1.5 sm:gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shrink-0 self-start sm:self-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-300">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                </svg>
                <span className="text-xs sm:text-sm font-medium text-amber-300">
                  ${stats?.earnings?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
            <p className="text-sm text-white/70 mb-2">
              💬 {isZh
                ? '咨询前请添加客服微信号：Stellawei2026，或发送邮件至：support@stellawei.org，以确保咨询能正常进行。'
                : 'Please add our customer service WeChat: Stellawei2026, or email: support@stellawei.org before your consultation to ensure everything goes smoothly.'}
            </p>
            <p className="text-white/70">
              {masterInfo
                ? `${masterInfo.specialties.join(' · ')} · ${masterInfo.experience}经验`
                : isZh
                  ? '管理您的订单和咨询'
                  : 'Manage your orders and consultations'}
            </p>
          </div>

          {/* 状态切换栏 */}
          <Card className="mb-6 bg-black/40 border-white/10 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white/60 mb-1">
                    {isZh ? '当前工作状态' : 'Current Work Status'}
                  </p>
                  <p className="text-xs sm:text-sm text-white/80">
                    {isZh
                      ? currentStatus === 'online'
                        ? '用户可以看到您并预约实时咨询'
                        : currentStatus === 'offline'
                          ? '用户可以看到您但只能预约留言咨询'
                          : '用户看不到您，无法预约任何咨询'
                      : currentStatus === 'online'
                        ? 'Users can see you and book real-time consultations'
                        : currentStatus === 'offline'
                          ? 'Users can see you but only book message consultations'
                          : 'Users cannot see you or book any consultations'}
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {(Object.keys(statusConfig) as Array<'online' | 'offline' | 'rest'>).map((s) => {
                    const config = statusConfig[s]
                    const Icon = config.icon
                    const isActive = currentStatus === s
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        disabled={updatingStatus}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          isActive
                            ? `${config.color} border-current`
                            : 'bg-white/10 text-white/70 border-white/15 hover:bg-white/5'
                        } disabled:opacity-50`}
                      >
                        <Icon className="w-4 h-4" />
                        {isZh ? config.label : config.labelEn}
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 可用时段设置 */}
          {masterInfo?.status === 'online' && (
            <Card className="mb-6 bg-black/40 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">
                      {isZh ? '设置可用时段' : 'Set Available Slots'}
                    </p>
                    <p className="text-sm text-white/60">
                      {isZh ? '选择日期，勾选开放预约的时间段。未设置的日期全部开放。' : 'Pick a date and select open slots. Dates without settings are fully open.'}
                    </p>
                  </div>
                  {savingSlots && (
                    <span className="text-sm text-white/50 flex items-center gap-1">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isZh ? '保存中...' : 'Saving...'}
                    </span>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  {/* 日历 */}
                  <div>
                    <SimpleCalendar
                      selected={selectedAvailabilityDate}
                      onSelect={(date) => handleDateSelect(date)}
                      disabled={(date) => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date.getTime() <= today.getTime()
                      }}
                    />
                    <p className="text-xs text-white/50 mt-2">
                      {isZh
                        ? `当前选择：${selectedAvailabilityDate.getFullYear()}-${String(selectedAvailabilityDate.getMonth() + 1).padStart(2, '0')}-${String(selectedAvailabilityDate.getDate()).padStart(2, '0')}`
                        : `Selected: ${selectedAvailabilityDate.getFullYear()}-${String(selectedAvailabilityDate.getMonth() + 1).padStart(2, '0')}-${String(selectedAvailabilityDate.getDate()).padStart(2, '0')}`}
                    </p>
                  </div>

                  {/* 时段选择 */}
                  <div className="flex-1">
                    {/* 批量操作按钮 */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                        onClick={() => saveAvailabilityForDate(selectedAvailabilityDate, ALL_TIME_SLOTS)}
                        disabled={savingSlots}
                      >
                        {isZh ? '全选' : 'Select All'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                        onClick={() => saveAvailabilityForDate(selectedAvailabilityDate, [])}
                        disabled={savingSlots}
                      >
                        {isZh ? '全部取消' : 'Clear All'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                        onClick={() => {
                          const morning = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
                          saveAvailabilityForDate(selectedAvailabilityDate, morning)
                        }}
                        disabled={savingSlots}
                      >
                        {isZh ? '上午' : 'Morning'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                        onClick={() => {
                          const afternoon = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
                          saveAvailabilityForDate(selectedAvailabilityDate, afternoon)
                        }}
                        disabled={savingSlots}
                      >
                        {isZh ? '下午' : 'Afternoon'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                        onClick={() => {
                          const evening = ['19:00', '19:30', '20:00', '20:30']
                          saveAvailabilityForDate(selectedAvailabilityDate, evening)
                        }}
                        disabled={savingSlots}
                      >
                        {isZh ? '晚上' : 'Evening'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-violet-600 text-white border-violet-600 hover:bg-violet-700"
                        onClick={syncToMonth}
                        disabled={syncingMonth || !availableSlots || availableSlots.length === 0}
                      >
                        {syncingMonth ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {isZh ? '同步中...' : 'Syncing...'}
                          </span>
                        ) : (
                          isZh ? '同步到本月' : 'Sync to Month'
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {ALL_TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => toggleSlot(slot)}
                          disabled={savingSlots}
                          className={`px-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            availableSlots?.includes(slot)
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-white/10 text-white/50 border-white/15 hover:bg-white/5'
                          } disabled:opacity-50`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    {availableSlots !== null && availableSlots.length === 0 && (
                      <p className="text-sm text-orange-300 mt-3">
                        {isZh ? '⚠️ 未选择任何时段，用户该日无法预约您' : '⚠️ No slots selected. Users cannot book you on this date.'}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-white/70" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">{isZh ? '总订单' : 'Total Orders'}</p>
                    <p className="text-2xl font-bold text-white">{totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/100/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">{isZh ? '待处理' : 'Pending'}</p>
                    <p className="text-2xl font-bold text-white">{pendingOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-violet-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">{isZh ? '处理中' : 'In Progress'}</p>
                    <p className="text-2xl font-bold text-white">{processingOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/100/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-300" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">{isZh ? '已完成' : 'Completed'}</p>
                    <p className="text-2xl font-bold text-white">{completedOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 最近订单 */}
          <Card className="mb-6 bg-black/40 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2 text-violet-300 !text-violet-300">
                <ShoppingBag className="w-5 h-5" />
                {isZh ? '最近订单' : 'Recent Orders'}
              </CardTitle>
              <Link href="/master/orders">
                <span className="text-sm text-violet-300 hover:text-violet-300 flex items-center gap-1">
                  {isZh ? '查看全部' : 'View All'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </CardHeader>
            {/* 订单状态筛选 */}
            <div className="px-6 pb-2">
              <div className="flex flex-wrap gap-2">
                {filterConfig.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setOrderFilter(f.key as any)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      orderFilter === f.key
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white/10 text-white/70 border-white/15 hover:bg-white/5'
                    }`}
                  >
                    {isZh ? f.label : f.labelEn}
                    <span className={`ml-1.5 text-xs ${orderFilter === f.key ? 'text-violet-300' : 'text-white/50'}`}>
                      ({f.count})
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <CardContent>
              {filteredBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-white/40 mx-auto mb-3" />
                  <p className="text-white/60">{isZh ? '暂无订单' : 'No orders yet'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBookings.map((booking) => {
                    const service = services[booking.service_id] || {
                      name: booking.service_id,
                      nameCn: booking.service_id,
                    }
                    const displayStatus = getDisplayStatus(booking)
                    const isPendingAccept =
                      booking.payment_status === 'paid' && displayStatus === 'pending'
                    const isToService =
                      booking.payment_status === 'paid' &&
                      (displayStatus === 'confirmed' || displayStatus === 'upcoming')
                    const isInProgress =
                      booking.payment_status === 'paid' && displayStatus === 'in_progress'
                    const isCompleted = displayStatus === 'completed' || displayStatus === 'ended'
                    const isExpired = (displayStatus as string) === 'expired' || (booking.payment_status === 'paid' && (displayStatus as string) === 'expired')

                    return (
                      <div
                        key={booking.id}
                        className="border border-white/15 rounded-lg p-4 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-sm sm:text-base truncate text-white !text-white">
                                {booking.user_name || booking.user_email || booking.user_id}
                              </span>
                              <Badge variant="outline" className={`text-xs ${booking.consultation_type === 'message' ? 'bg-white/10 text-white/70 border-white/15' : 'bg-violet-500/10 text-violet-300 border-violet-500/30'}`}>
                                {booking.consultation_type === 'message'
                                  ? (isZh ? '留言咨询' : 'Message')
                                  : booking.tier === 'deep'
                                    ? (isZh ? '深度咨询' : 'Deep')
                                    : (isZh ? '普通咨询' : 'Standard')}
                              </Badge>
                              {getStatusBadge(displayStatus, booking.payment_status, booking.status)}
                            </div>
                            <div className="text-xs text-white/50 mb-1.5">
                              {isZh ? '订单号' : 'Order'}: {booking.order_number || booking.id.slice(0, 8)}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-white/60">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatBookingTimeDisplay(booking, { showLocalTime: true })}
                              </span>
                              <span>{booking.duration_minutes} min</span>
                            </div>
                            <p className="text-sm font-medium text-violet-300 mt-2">
                              ${booking.total_amount}
                            </p>
                          </div>
                          <div className="flex flex-wrap sm:flex-col gap-2 sm:min-w-[100px]">
                            {isPendingAccept && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white w-full"
                                onClick={() => handleAccept(booking.id)}
                                disabled={acceptingId === booking.id}
                              >
                                {acceptingId === booking.id
                                  ? isZh
                                    ? '处理中...'
                                    : 'Processing...'
                                  : isZh
                                    ? '接单'
                                    : 'Accept'}
                              </Button>
                            )}
                            {/* 休息中状态 - 师傅可以取消已付款订单并申请退款 */}
                            {masterInfo?.status === 'rest' && booking.payment_status === 'paid' && !isCompleted && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-400 border-red-500/30 hover:bg-red-500/100/100/10 w-full"
                                onClick={() => {
                                  setCancelBooking(booking)
                                  setCancelReason('')
                                  setShowCancelModal(true)
                                }}
                              >
                                {isZh ? '取消并退款' : 'Cancel & Refund'}
                              </Button>
                            )}
                            {/* 待服务订单 - 可修改时间 */}
                            {isToService && (
                              <>
                                {booking.consultation_type === 'message' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 w-full"
                                    onClick={() => {
                                      setSelectedBooking(booking)
                                      setShowMessageModal(true)
                                    }}
                                  >
                                    <MessageSquare className="w-4 h-4 mr-1" />
                                    {isZh ? '查看留言' : 'View Message'}
                                  </Button>
                                ) : (
                                  <>
                                    <Link href={`/chat/${booking.id}`} className="inline-flex">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 w-full"
                                      >
                                        <MessageCircle className="w-4 h-4 mr-1" />
                                        {isZh ? '进入咨询' : 'Enter Chat'}
                                      </Button>
                                    </Link>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-300 border-blue-500/30 hover:bg-blue-500/100/100/10 hover:text-blue-700 w-full"
                                      onClick={() => openRescheduleModal(booking)}
                                    >
                                      <Calendar className="w-4 h-4 mr-1" />
                                      {isZh ? '修改时间' : 'Reschedule'}
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            {/* 进行中订单 - 不可修改时间 */}
                            {isInProgress && (
                              <>
                                {booking.consultation_type === 'message' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 w-full"
                                    onClick={() => {
                                      setSelectedBooking(booking)
                                      setShowMessageModal(true)
                                    }}
                                  >
                                    <MessageSquare className="w-4 h-4 mr-1" />
                                    {isZh ? '查看留言' : 'View Message'}
                                  </Button>
                                ) : (
                                  <Link href={`/chat/${booking.id}`} className="inline-flex">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10 w-full"
                                    >
                                      <MessageCircle className="w-4 h-4 mr-1" />
                                      {isZh ? '进入咨询' : 'Enter Chat'}
                                    </Button>
                                  </Link>
                                )}
                              </>
                            )}
                            {isCompleted && (
                              <>
                                {booking.consultation_type === 'message' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-white/70 border-white/20 hover:bg-white/10 w-full"
                                    onClick={async () => {
                                      setHistoryBooking(booking)
                                      setShowHistoryModal(true)
                                      setHistoryLoading(true)
                                      try {
                                        const supabase = createClient()
                                        const { data: { session } } = await supabase.auth.getSession()
                                        const res = await fetch(`/api/chat/${booking.id}/messages`, {
                                          headers: { authorization: `Bearer ${session?.access_token || ''}` },
                                        })
                                        if (res.ok) {
                                          const data = await res.json()
                                          setHistoryMessages(data.messages || [])
                                        }
                                      } catch (err) {
                                      } finally {
                                        setHistoryLoading(false)
                                      }
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {isZh ? '查看历史' : 'View History'}
                                  </Button>
                                ) : (
                                  <Link href={`/chat/${booking.id}`} className="inline-flex">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-white/70 border-white/20 hover:bg-white/10 w-full"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      {isZh ? '查看历史对话' : 'View History'}
                                    </Button>
                                  </Link>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-amber-300 border-amber-500/30 hover:bg-amber-500/100/100/10 w-full"
                                  onClick={() => loadReview(booking)}
                                >
                                  <Star className="w-4 h-4 mr-1" />
                                  {isZh ? '查看评价' : 'View Review'}
                                </Button>
                              </>
                            )}
                            {(booking.status === 'cancelled' ||
                              booking.payment_status === 'cancelled') && !isExpired && (
                              <Badge variant="outline" className="self-center">
                                {isZh ? '已取消' : 'Cancelled'}
                              </Badge>
                            )}
                            {/* 过期订单 - 删除按钮 */}
                            {isExpired && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-400 border-red-500/30 hover:bg-red-500/100/100/10 w-full"
                                onClick={() => handleDeleteExpired(booking.id)}
                              >
                                <Trash className="w-4 h-4 mr-1" />
                                {isZh ? '删除' : 'Delete'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* 加载更多 */}
                  {hasMoreBookings && (
                    <div className="text-center pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMoreBookings}
                        disabled={loadingMore}
                        className="w-full sm:w-auto"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            {isZh ? '加载中...' : 'Loading...'}
                          </>
                        ) : (
                          <>
                            {isZh ? '加载更多订单' : 'Load More Orders'}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 我的客户 */}
          <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-violet-300 !text-violet-300">
                <User className="w-5 h-5" />
                {isZh ? '我的客户' : 'My Customers'}
              </CardTitle>
              <span className="text-sm text-white/50">
                {customers.length} {isZh ? '位客户' : 'customers'}
              </span>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-white/40 mx-auto mb-3" />
                  <p className="text-white/60">{isZh ? '暂无客户' : 'No customers yet'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customers.map((customer: any) => (
                    <div
                      key={customer.user.id}
                      className="border border-white/15 rounded-lg p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm sm:text-base truncate text-white !text-white">
                              {customer.user.full_name || customer.user.email}
                            </span>
                            <Badge variant="outline" className="text-xs bg-white/10 text-white/70 border-white/15">
                              {customer.bookings.length} {isZh ? '次咨询' : 'sessions'}
                            </Badge>
                          </div>
                          <p className="text-sm text-white/60">
                            {isZh ? '最近咨询：' : 'Last consultation: '}
                            {new Date(customer.lastBookingDate).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {customer.bookings.slice(0, 3).map((b: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs bg-white/10 text-white/70 border-white/15">
                                {b.consultation_type === 'message'
                                  ? (isZh ? '留言' : 'Msg')
                                  : (isZh ? '实时' : 'Live')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10"
                            onClick={() => handleViewCustomerMessages(customer)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {isZh ? '查看消息' : 'View Messages'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-violet-300 border-violet-500/30 hover:bg-violet-500/10"
                            onClick={() => {
                              setSelectedCustomer(customer)
                              setShowCustomerMessageModal(true)
                            }}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            {isZh ? '发消息' : 'Message'}
                          </Button>
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

      {/* 查看客户历史消息弹窗 */}
      {showCustomerHistoryModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isZh ? '历史消息' : 'Message History'}
              </h3>
              <button
                onClick={() => {
                  setShowCustomerHistoryModal(false)
                  setSelectedCustomer(null)
                  setCustomerMessages([])
                }}
                className="text-white/50 hover:text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-3">
              {isZh ? '客户：' : 'Customer: '}
              {selectedCustomer.user.full_name || selectedCustomer.user.email}
            </p>
            
            {customerMessagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-white/50" />
              </div>
            ) : customerMessages.length === 0 ? (
              <div className="text-center py-8 bg-white/5 rounded-lg">
                <MessageSquare className="w-8 h-8 text-white/40 mx-auto mb-2" />
                <p className="text-white/60 text-sm">
                  {isZh ? '暂无发送记录' : 'No messages sent yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerMessages.map((msg: any) => (
                  <div key={msg.id} className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-3 h-3 text-violet-300" />
                      <span className="text-xs font-medium text-violet-300">{msg.sender_name}</span>
                      <span className="text-xs text-violet-400">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap">{msg.content}</p>
                    {msg.image_url && (
                      <img
                        src={msg.image_url}
                        alt="Message image"
                        className="mt-2 max-w-full rounded-lg cursor-pointer"
                        loading="lazy"
                        onClick={() => window.open(msg.image_url, '_blank')}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomerHistoryModal(false)
                  setSelectedCustomer(null)
                  setCustomerMessages([])
                }}
              >
                {isZh ? '关闭' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 给客户发消息弹窗 */}
      {showCustomerMessageModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isZh ? '给客户发消息' : 'Send Message'}
              </h3>
              <button
                onClick={() => {
                  setShowCustomerMessageModal(false)
                  setSelectedCustomer(null)
                  setCustomerMessageText('')
                }}
                className="text-white/50 hover:text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-white/60 mb-3">
              {isZh ? '发给：' : 'To: '}
              {selectedCustomer.user.full_name || selectedCustomer.user.email}
            </p>
            <textarea
              value={customerMessageText}
              onChange={(e) => setCustomerMessageText(e.target.value)}
              placeholder={
                isZh
                  ? '写点什么...（会出现在客户的「我的留言」中）'
                  : "Write something... (will appear in customer's messages)"
              }
              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[120px] resize-y mb-4"
              maxLength={500}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomerMessageModal(false)
                  setSelectedCustomer(null)
                  setCustomerMessageText('')
                }}
              >
                {isZh ? '取消' : 'Cancel'}
              </Button>
              <Button
                className="bg-violet-600 hover:bg-violet-700"
                onClick={handleSendCustomerMessage}
                disabled={!customerMessageText.trim() || sendingCustomerMessage}
              >
                {sendingCustomerMessage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {isZh ? '发送中...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" />
                    {isZh ? '发送' : 'Send'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 查看历史弹窗（已完成订单） */}
      {showHistoryModal && historyBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isZh ? '查看历史' : 'View History'}
              </h3>
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setHistoryBooking(null)
                  setHistoryMessages([])
                }}
                className="text-white/50 hover:text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 用户问题 */}
            <div className="bg-white/5 border border-white/15 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-white/50" />
                <span className="text-sm font-medium text-white/70">
                  {isZh ? '用户提问' : 'User Question'}
                </span>
              </div>
              <p className="text-sm text-white/80 whitespace-pre-wrap">
                {historyBooking.question_text || (isZh ? '（无文字描述）' : '(No text description)')}
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
              <h4 className="text-sm font-medium text-white/80 mb-2">
                {isZh ? '师傅回复' : "Master's Reply"}
              </h4>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                </div>
              ) : historyMessages.length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-lg">
                  <p className="text-white/60 text-sm">
                    {isZh ? '暂无回复' : 'No reply yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyMessages.map((msg: any) => (
                    <div key={msg.id} className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-3 h-3 text-violet-300" />
                        <span className="text-xs font-medium text-violet-300">{msg.sender_name}</span>
                        <span className="text-xs text-violet-400">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 whitespace-pre-wrap">{msg.content}</p>
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
              <Button
                variant="outline"
                onClick={() => {
                  setShowHistoryModal(false)
                  setHistoryBooking(null)
                  setHistoryMessages([])
                }}
              >
                {isZh ? '关闭' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 查看评价弹窗（师傅端只读） */}
      {showReviewModal && reviewTargetBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isZh ? '查看评价' : 'View Review'}
              </h3>
              <button
                onClick={() => {
                  setShowReviewModal(false)
                  setReviewTargetBooking(null)
                  setReviewData(null)
                }}
                className="text-white/50 hover:text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-white/50" />
              </div>
            ) : reviewData ? (
              <div className="space-y-4">
                <div className="flex justify-center gap-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-8 h-8 ${
                        star <= (reviewData.rating || 0)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-white/40'
                      }`}
                    />
                  ))}
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-sm text-white/70 whitespace-pre-wrap">
                    {reviewData.content || (isZh ? '（用户未留下文字评价）' : 'No written review')}
                  </p>
                </div>
                <p className="text-xs text-white/50 text-center">
                  {reviewData.created_at
                    ? new Date(reviewData.created_at).toLocaleString()
                    : ''}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/60 text-sm">
                  {isZh ? '该订单暂无评价' : 'No review for this booking'}
                </p>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReviewModal(false)
                  setReviewTargetBooking(null)
                  setReviewData(null)
                }}
              >
                {isZh ? '关闭' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 查看留言弹窗 */}
      {showMessageModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {isZh ? '查看留言' : 'View Message'}
              </h3>
              <button
                onClick={() => {
                  setShowMessageModal(false)
                  setSelectedBooking(null)
                  setMessageReply('')
                }}
                className="text-white/50 hover:text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* 用户问题 */}
            <div className="bg-white/5 border border-white/15 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-white/50" />
                <span className="text-sm font-medium text-white/70">
                  {isZh ? '用户提问' : 'User Question'}
                </span>
              </div>
              <p className="text-sm text-white/80 whitespace-pre-wrap">
                {selectedBooking.question_text || (isZh ? '（无文字描述）' : '(No text description)')}
              </p>
              {selectedBooking.question_images && selectedBooking.question_images.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {selectedBooking.question_images.map((url: string, index: number) => (
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
              <label className="block text-sm font-medium text-white/80 mb-2">
                {isZh ? '您的回复' : 'Your Reply'}
              </label>
              <textarea
                value={messageReply}
                onChange={(e) => setMessageReply(e.target.value)}
                placeholder={isZh ? '请写下您的回复...' : 'Write your reply...'}
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[120px] resize-y"
                maxLength={1000}
              />
              <p className="text-xs text-white/50 mt-1 text-right">
                {messageReply.length}/1000
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMessageModal(false)
                  setSelectedBooking(null)
                  setMessageReply('')
                }}
              >
                {isZh ? '关闭' : 'Close'}
              </Button>
              <Button
                className="bg-violet-600 hover:bg-violet-700"
                onClick={handleReplyMessage}
                disabled={!messageReply.trim() || sendingReply}
              >
                {sendingReply ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {isZh ? '发送中...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1" />
                    {isZh ? '发送回复' : 'Send Reply'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 取消订单并退款弹窗 */}
      {showCancelModal && cancelBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-400">
                {isZh ? '取消订单并申请退款' : 'Cancel Order & Request Refund'}
              </h3>
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelBooking(null)
                  setCancelReason('')
                }}
                className="text-white/50 hover:text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-white/70 mb-4">
              {isZh
                ? `订单号：${cancelBooking.order_number || cancelBooking.id} · ${cancelBooking.scheduled_date} ${cancelBooking.scheduled_time}`
                : `Order: ${cancelBooking.order_number || cancelBooking.id} · ${cancelBooking.scheduled_date} ${cancelBooking.scheduled_time}`}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-white/80 mb-2">
                {isZh ? '取消原因（会通知给用户）：' : 'Cancellation reason (will be sent to user):'}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={isZh ? '例如：临时有事无法按时咨询，非常抱歉...' : 'e.g., Unable to attend due to emergency, sorry...'}
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px] resize-y"
                maxLength={500}
              />
              <p className="text-xs text-white/50 mt-1 text-right">
                {cancelReason.length}/500
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelBooking(null)
                  setCancelReason('')
                }}
                className="flex-1"
              >
                {isZh ? '暂不取消' : 'Keep Order'}
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!cancelReason.trim()) {
                    alert(isZh ? '请填写取消原因' : 'Please provide a cancellation reason')
                    return
                  }
                  setCancelling(true)
                  try {
                    const supabase = createClient()
                    const { data: { session } } = await supabase.auth.getSession()
                    const res = await fetch('/api/master/cancel-booking', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        authorization: `Bearer ${session?.access_token || ''}`,
                      },
                      body: JSON.stringify({
                        bookingId: cancelBooking.id,
                        reason: cancelReason,
                      }),
                    })
                    if (res.ok) {
                      setBookings(prev => prev.map(b => b.id === cancelBooking.id ? { ...b, status: 'refund_requested', payment_status: 'refund_requested' } : b))
                      setShowCancelModal(false)
                      setCancelBooking(null)
                      setCancelReason('')
                      alert(isZh ? '已取消订单并申请退款，总裁将在后台处理退款。' : 'Order cancelled and refund requested. The admin will process the refund.')
                    } else {
                      const err = await res.json()
                      alert(err.error || 'Failed')
                    }
                  } catch (err: any) {
                    alert(err.message || 'Failed')
                  } finally {
                    setCancelling(false)
                  }
                }}
                disabled={cancelling}
                className="flex-1"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {isZh ? '处理中...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    {isZh ? '确认取消并退款' : 'Confirm Cancel'}
                  </>
                )}
              </Button>
            </div>
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
                ? `当前预约：${rescheduleBooking.scheduled_date || '-'} ${rescheduleBooking.scheduled_time || ''}`
                : `Current: ${rescheduleBooking.scheduled_date || '-'} ${rescheduleBooking.scheduled_time || ''}`}
            </p>
            <p className="text-white/50 text-center mb-6 text-xs">
              {isZh
                ? `师傅时间：${TIMEZONE_LABELS[rescheduleBooking.timezone]?.zh || rescheduleBooking.timezone || ''}`
                : `Advisor time: ${TIMEZONE_LABELS[rescheduleBooking.timezone]?.en || rescheduleBooking.timezone || ''}`}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-white/80 mb-2">
                {isZh ? '选择日期' : 'Select Date'}
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => handleRescheduleDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
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
                          : 'bg-white/10 text-white/80 border-white/15 hover:border-violet-400 hover:text-violet-300'
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
    </div>
  )
}
