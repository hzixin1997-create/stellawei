'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { getConsultationDisplayStatus } from '@/lib/utils'
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

interface Booking {
  id: string
  master_id: string
  service_id: string
  scheduled_date: string
  scheduled_time: string
  scheduled_at?: string
  duration_minutes: number
  status: string
  payment_status: string
  total_amount: number
  currency: string
  user_id: string
  created_at: string
  expires_at?: string | null
  deleted_at?: string | null
  order_number?: string
  consultation_type?: string
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
  online: { label: '在线', labelEn: 'Online', color: 'bg-green-100 text-green-700 border-green-200', icon: Wifi },
  offline: { label: '离线', labelEn: 'Offline', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: WifiOff },
  rest: { label: '休息中', labelEn: 'Resting', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Moon },
}

export default function MasterDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [masterInfo, setMasterInfo] = useState<MasterInfo | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isZh, setIsZh] = useState(true)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [messageReply, setMessageReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [showCustomerMessageModal, setShowCustomerMessageModal] = useState(false)
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

      // 2. 获取师傅信息（含状态）
      const { data: { session } } = await supabase.auth.getSession()
      const masterRes = await fetch('/api/master/profile', {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (masterRes.ok) {
        const masterJson = await masterRes.json()
        if (masterJson.master) {
          setMasterInfo(masterJson.master)
        }
      }

      // 3,4. 并行获取 bookings 和 customers（不互相依赖）
      const bookingsPromise = fetch('/api/master/bookings', {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      }).then(r => r.json())

      setCustomersLoading(true)
      const customersPromise = fetch('/api/master/customers', {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      }).then(r => r.json()).catch(() => ({ customers: [] })).finally(() => setCustomersLoading(false))

      // 5. 并行执行 availability（不依赖 bookings/customers）
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
      const availabilityPromise = fetch(`/api/master/availability?date=${dateStr}`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      }).then(r => r.json()).catch(() => ({ available_slots: [] }))

      // 等待并行请求完成
      const [bookingsJson, customersJson, availabilityJson] = await Promise.all([
        bookingsPromise,
        customersPromise,
        availabilityPromise,
      ])

      if (bookingsJson.bookings) {
        setBookings(bookingsJson.bookings.filter((b: any) => !b.deleted_at))
      }
      if (customersJson.customers) {
        setCustomers(customersJson.customers)
      }
      if (availabilityJson.available_slots) {
        setAvailableSlots(availabilityJson.available_slots)
      }

      setIsLoading(false)
    }

    getUserAndBookings()
  }, [router])

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
    const scheduledAt = b.scheduled_at
      ? b.scheduled_at
      : b.scheduled_date && b.scheduled_time
        ? `${b.scheduled_date}T${b.scheduled_time}`
        : null
    return getConsultationDisplayStatus({
      status: b.status,
      scheduled_at: scheduledAt,
      duration_minutes: b.duration_minutes || 30,
      expires_at: b.expires_at,
    })
  }

  const visibleBookings = bookings.filter((b) => !b.deleted_at && b.status !== 'cancelled' && b.payment_status !== 'cancelled' && b.payment_status !== 'refunded')
  const totalOrders = visibleBookings.length
  const pendingOrders = visibleBookings.filter(
    (b) => b.payment_status === 'paid' && getDisplayStatus(b) === 'pending'
  ).length
  const processingOrders = visibleBookings.filter(
    (b) =>
      b.payment_status === 'paid' &&
      (getDisplayStatus(b) === 'confirmed' || getDisplayStatus(b) === 'in_progress')
  ).length
  const completedOrders = visibleBookings.filter(
    (b) => getDisplayStatus(b) === 'completed'
  ).length

  // 状态标签样式（基于 displayStatus）
  const getStatusBadge = (displayStatus: string, paymentStatus: string) => {
    if (displayStatus === 'expired' || (paymentStatus === 'pending' && displayStatus === 'expired')) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
          {isZh ? '已过期' : 'Expired'}
        </Badge>
      )
    }
    if (paymentStatus === 'pending' || paymentStatus === 'pending_payment') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          {isZh ? '待支付' : 'Pending Payment'}
        </Badge>
      )
    }
    if (paymentStatus === 'paid' && displayStatus === 'pending') {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          {isZh ? '待接单' : 'Pending Accept'}
        </Badge>
      )
    }
    if (displayStatus === 'confirmed') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          {isZh ? '已接单' : 'Confirmed'}
        </Badge>
      )
    }
    if (displayStatus === 'in_progress') {
      return (
        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
          {isZh ? '进行中' : 'In Progress'}
        </Badge>
      )
    }
    if (displayStatus === 'completed') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          {isZh ? '已完成' : 'Completed'}
        </Badge>
      )
    }
    if (displayStatus === 'cancelled' || paymentStatus === 'cancelled') {
      return (
        <Badge variant="outline" className="bg-stone-100 text-stone-500 border-stone-200">
          {isZh ? '已取消' : 'Cancelled'}
        </Badge>
      )
    }
    if (paymentStatus === 'refunded') {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200">
          {isZh ? '已退款' : 'Refunded'}
        </Badge>
      )
    }
    return <Badge variant="outline">{displayStatus}</Badge>
  }

  // 接单
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  const currentStatus = masterInfo?.status || 'online'
  const statusInfo = statusConfig[currentStatus]
  const StatusIcon = statusInfo.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-stone-600 hover:text-stone-900">
            <Home className="w-5 h-5 mr-2" />
            <span className="font-medium">{isZh ? '返回首页' : 'Back to Home'}</span>
          </Link>
          <h1 className="text-lg font-bold text-stone-900 absolute left-1/2 -translate-x-1/2">
            {isZh ? '师傅后台' : 'Master Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsZh(!isZh)}
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 transition-colors"
            >
              <span className="w-5 h-5 rounded-full border border-stone-300 flex items-center justify-center text-xs">
                {isZh ? '中' : 'EN'}
              </span>
              {isZh ? 'EN / 中' : 'EN / 中'}
            </button>
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
          {/* 欢迎语 + 状态控制 + 钱包 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-serif font-bold text-stone-900">
                {isZh
                  ? `欢迎回来，${masterInfo?.name || ''}师傅`
                  : `Welcome Back, ${masterInfo?.name || ''}`}
              </h1>
              <Badge variant="outline" className={`flex items-center gap-1 ${statusInfo.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {isZh ? statusInfo.label : statusInfo.labelEn}
              </Badge>
              {/* 钱包图标 + 累计收入 */}
              <div className="ml-auto flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                </svg>
                <span className="text-sm font-medium text-amber-700">
                  ${bookings
                    .filter(b => ['completed', 'confirmed', 'in_progress'].includes(b.status) && b.payment_status === 'paid')
                    .reduce((sum, b) => sum + (b.total_amount || 0) * 0.7, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
            <p className="text-stone-600">
              {masterInfo
                ? `${masterInfo.specialties.join(' · ')} · ${masterInfo.experience}经验`
                : isZh
                  ? '管理您的订单和咨询'
                  : 'Manage your orders and consultations'}
            </p>
          </div>

          {/* 状态切换栏 */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-stone-500 mb-1">
                    {isZh ? '当前工作状态' : 'Current Work Status'}
                  </p>
                  <p className="text-sm text-stone-700">
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
                <div className="flex gap-2">
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
                            : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
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
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-stone-900">
                      {isZh ? '设置可用时段' : 'Set Available Slots'}
                    </p>
                    <p className="text-sm text-stone-500">
                      {isZh ? '选择日期，勾选开放预约的时间段。未设置的日期全部开放。' : 'Pick a date and select open slots. Dates without settings are fully open.'}
                    </p>
                  </div>
                  {savingSlots && (
                    <span className="text-sm text-stone-400 flex items-center gap-1">
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
                    <p className="text-xs text-stone-400 mt-2">
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
                        onClick={() => saveAvailabilityForDate(selectedAvailabilityDate, ALL_TIME_SLOTS)}
                        disabled={savingSlots}
                      >
                        {isZh ? '全选' : 'Select All'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveAvailabilityForDate(selectedAvailabilityDate, [])}
                        disabled={savingSlots}
                      >
                        {isZh ? '全部取消' : 'Clear All'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
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
                              ? 'bg-violet-100 text-violet-700 border-violet-300'
                              : 'bg-white text-stone-400 border-stone-200 hover:bg-stone-50'
                          } disabled:opacity-50`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                    {availableSlots !== null && availableSlots.length === 0 && (
                      <p className="text-sm text-orange-500 mt-3">
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
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{isZh ? '总订单' : 'Total Orders'}</p>
                    <p className="text-2xl font-bold">{totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{isZh ? '待处理' : 'Pending'}</p>
                    <p className="text-2xl font-bold">{pendingOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{isZh ? '处理中' : 'In Progress'}</p>
                    <p className="text-2xl font-bold">{processingOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{isZh ? '已完成' : 'Completed'}</p>
                    <p className="text-2xl font-bold">{completedOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 最近订单 */}
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {isZh ? '最近订单' : 'Recent Orders'}
              </CardTitle>
              <Link href="/master/orders">
                <span className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1">
                  {isZh ? '查看全部' : 'View All'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </CardHeader>
            <CardContent>
              {visibleBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500">{isZh ? '暂无订单' : 'No orders yet'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleBookings.slice(0, 5).map((booking) => {
                    const service = services[booking.service_id] || {
                      name: booking.service_id,
                      nameCn: booking.service_id,
                    }
                    const displayStatus = getDisplayStatus(booking)
                    const isPendingAccept =
                      booking.payment_status === 'paid' && displayStatus === 'pending'
                    const isProcessing =
                      booking.payment_status === 'paid' &&
                      (displayStatus === 'confirmed' || displayStatus === 'in_progress')
                    const isCompleted = displayStatus === 'completed'

                    return (
                      <div
                        key={booking.id}
                        className="border rounded-lg p-4 hover:bg-stone-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">
                                {isZh ? service.nameCn : service.name}
                              </span>
                              {getStatusBadge(displayStatus, booking.payment_status)}
                            </div>
                            <div className="text-xs text-stone-400 mb-1.5">
                              {isZh ? '订单号' : 'Order'}: {booking.order_number || booking.id.slice(0, 8)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-stone-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {booking.scheduled_date} {booking.scheduled_time}
                              </span>
                              <span>{booking.duration_minutes} min</span>
                            </div>
                            <p className="text-sm font-medium text-violet-600 mt-2">
                              ${booking.total_amount}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 ml-4 min-w-[100px]">
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
                                className="text-red-600 border-red-200 hover:bg-red-50 w-full"
                                onClick={() => {
                                  setCancelBooking(booking)
                                  setCancelReason('')
                                  setShowCancelModal(true)
                                }}
                              >
                                {isZh ? '取消并退款' : 'Cancel & Refund'}
                              </Button>
                            )}
                            {/* 进行中订单 - 实时咨询进入对话 / 留言咨询查看留言 */}
                            {isProcessing && (
                              <>
                                {booking.consultation_type === 'message' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-violet-600 border-violet-200 hover:bg-violet-50 w-full"
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
                                      className="text-violet-600 border-violet-200 hover:bg-violet-50 w-full"
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
                                    className="text-stone-600 border-stone-300 hover:bg-stone-100 w-full"
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
                                      className="text-stone-600 border-stone-300 hover:bg-stone-100 w-full"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      {isZh ? '查看历史对话' : 'View History'}
                                    </Button>
                                  </Link>
                                )}
                              </>
                            )}
                            {(booking.status === 'cancelled' ||
                              booking.payment_status === 'cancelled') && (
                              <Badge variant="outline" className="self-center">
                                {isZh ? '已取消' : 'Cancelled'}
                              </Badge>
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

          {/* 我的客户 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {isZh ? '我的客户' : 'My Customers'}
              </CardTitle>
              <span className="text-sm text-stone-400">
                {customers.length} {isZh ? '位客户' : 'customers'}
              </span>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500">{isZh ? '暂无客户' : 'No customers yet'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customers.map((customer: any) => (
                    <div
                      key={customer.user.id}
                      className="border rounded-lg p-4 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {customer.user.full_name || customer.user.email}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {customer.bookings.length} {isZh ? '次咨询' : 'sessions'}
                            </Badge>
                          </div>
                          <p className="text-sm text-stone-500">
                            {isZh ? '最近咨询：' : 'Last consultation: '}
                            {new Date(customer.lastBookingDate).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {customer.bookings.slice(0, 3).map((b: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {b.consultation_type === 'message'
                                  ? (isZh ? '留言' : 'Msg')
                                  : (isZh ? '实时' : 'Live')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-violet-600 border-violet-200 hover:bg-violet-50"
                            onClick={() => handleViewCustomerMessages(customer)}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {isZh ? '查看消息' : 'View Messages'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-violet-600 border-violet-200 hover:bg-violet-50"
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
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-stone-500 mb-3">
              {isZh ? '客户：' : 'Customer: '}
              {selectedCustomer.user.full_name || selectedCustomer.user.email}
            </p>
            
            {customerMessagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
              </div>
            ) : customerMessages.length === 0 ? (
              <div className="text-center py-8 bg-stone-50 rounded-lg">
                <MessageSquare className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-500 text-sm">
                  {isZh ? '暂无发送记录' : 'No messages sent yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {customerMessages.map((msg: any) => (
                  <div key={msg.id} className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-3 h-3 text-violet-500" />
                      <span className="text-xs font-medium text-violet-700">{msg.sender_name}</span>
                      <span className="text-xs text-violet-400">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-stone-700 whitespace-pre-wrap">{msg.content}</p>
                    {msg.image_url && (
                      <img
                        src={msg.image_url}
                        alt="Message image"
                        className="mt-2 max-w-full rounded-lg cursor-pointer"
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
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-stone-500 mb-3">
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
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 用户问题 */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-stone-400" />
                <span className="text-sm font-medium text-stone-600">
                  {isZh ? '用户提问' : 'User Question'}
                </span>
              </div>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">
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
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 师傅回复 */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-stone-700 mb-2">
                {isZh ? '师傅回复' : "Master's Reply"}
              </h4>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                </div>
              ) : historyMessages.length === 0 ? (
                <div className="text-center py-8 bg-stone-50 rounded-lg">
                  <p className="text-stone-500 text-sm">
                    {isZh ? '暂无回复' : 'No reply yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyMessages.map((msg: any) => (
                    <div key={msg.id} className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-3 h-3 text-violet-500" />
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
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* 用户问题 */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-stone-400" />
                <span className="text-sm font-medium text-stone-600">
                  {isZh ? '用户提问' : 'User Question'}
                </span>
              </div>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">
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
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>
            
            {/* 师傅回复 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {isZh ? '您的回复' : 'Your Reply'}
              </label>
              <textarea
                value={messageReply}
                onChange={(e) => setMessageReply(e.target.value)}
                placeholder={isZh ? '请写下您的回复...' : 'Write your reply...'}
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[120px] resize-y"
                maxLength={1000}
              />
              <p className="text-xs text-stone-400 mt-1 text-right">
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
              <h3 className="text-lg font-bold text-red-600">
                {isZh ? '取消订单并申请退款' : 'Cancel Order & Request Refund'}
              </h3>
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancelBooking(null)
                  setCancelReason('')
                }}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-stone-600 mb-4">
              {isZh
                ? `订单号：${cancelBooking.order_number || cancelBooking.id} · ${cancelBooking.scheduled_date} ${cancelBooking.scheduled_time}`
                : `Order: ${cancelBooking.order_number || cancelBooking.id} · ${cancelBooking.scheduled_date} ${cancelBooking.scheduled_time}`}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {isZh ? '取消原因（会通知给用户）：' : 'Cancellation reason (will be sent to user):'}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={isZh ? '例如：临时有事无法按时咨询，非常抱歉...' : 'e.g., Unable to attend due to emergency, sorry...'}
                className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px] resize-y"
                maxLength={500}
              />
              <p className="text-xs text-stone-400 mt-1 text-right">
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
    </div>
  )
}
