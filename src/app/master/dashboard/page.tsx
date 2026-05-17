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
  Wifi,
  WifiOff,
  Moon,
} from 'lucide-react'
import Link from 'next/link'

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
  deleted_at?: string | null
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

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
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

      // 3. 查询师傅的 bookings
      const bookingsRes = await fetch('/api/master/bookings', {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      const bookingsJson = await bookingsRes.json()

      if (bookingsRes.ok && bookingsJson.bookings) {
        setBookings(bookingsJson.bookings.filter((b: any) => !b.deleted_at))
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
      const res = await fetch('/api/master/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    })
  }

  const visibleBookings = bookings.filter((b) => !b.deleted_at)
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
      console.error('Accept error:', err)
      alert(isZh ? `接单失败: ${err.message}` : `Accept failed: ${err.message}`)
    } finally {
      setAcceptingId(null)
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
          {/* 欢迎语 + 状态控制 */}
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
                            {isProcessing && (
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
                            {isCompleted && (
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
        </div>
      </div>
    </div>
  )
}
