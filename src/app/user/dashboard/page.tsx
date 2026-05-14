'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, MessageSquare, ArrowRight, Clock, User, Home, LogOut, Video, MessageCircle } from 'lucide-react'
import Link from 'next/link'

// 师傅数据（用于展示）
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
}

export default function UserDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isZh, setIsZh] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

      // 2. 查询用户的 bookings（实时咨询订单）
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!bookingsError && bookingsData) {
        setBookings(bookingsData)
      }

      setIsLoading(false)
    }

    getUserAndBookings()
  }, [router])

  // 状态标签样式
  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'pending' || paymentStatus === 'pending_payment') {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{isZh ? '待支付' : 'Pending Payment'}</Badge>
    }
    if (paymentStatus === 'paid') {
      if (status === 'confirmed' || status === 'in_progress') {
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{isZh ? '已确认' : 'Confirmed'}</Badge>
      }
      if (status === 'completed') {
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{isZh ? '已完成' : 'Completed'}</Badge>
      }
      return <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">{isZh ? '已支付' : 'Paid'}</Badge>
    }
    if (paymentStatus === 'failed') {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{isZh ? '支付失败' : 'Failed'}</Badge>
    }
    if (status === 'cancelled' || paymentStatus === 'cancelled') {
      return <Badge variant="outline" className="bg-stone-100 text-stone-500 border-stone-200">{isZh ? '已取消' : 'Cancelled'}</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  // 判断订单是否可以进入聊天
  const canEnterChat = (booking: Booking) => {
    return booking.payment_status === 'paid' && 
      (booking.status === 'confirmed' || booking.status === 'in_progress')
  }

  // 取消订单
  const handleCancel = async (bookingId: string) => {
    if (!confirm(isZh ? '确定要取消这个预约吗？' : 'Are you sure you want to cancel this booking?')) {
      return
    }
    setCancellingId(bookingId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .eq('user_id', user.id)

      if (error) {
        alert(isZh ? '取消失败，请重试' : 'Cancel failed, please try again')
        console.error('Cancel error:', error)
      } else {
        // 本地更新状态为已取消
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled', payment_status: 'cancelled' } : b))
      }
    } catch (err) {
      console.error('Cancel error:', err)
      alert(isZh ? '取消失败' : 'Cancel failed')
    } finally {
      setCancellingId(null)
    }
  }

  // 删除订单（仅限已取消的订单）
  const handleDelete = async (bookingId: string) => {
    if (!confirm(isZh ? '确定要永久删除这条订单记录吗？删除后不可恢复。' : 'Are you sure you want to permanently delete this order? This action cannot be undone.')) {
      return
    }
    setDeletingId(bookingId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId)
        .eq('user_id', user.id)

      if (error) {
        alert(isZh ? '删除失败，请重试' : 'Delete failed, please try again')
        console.error('Delete error:', error)
      } else {
        // 本地移除
        setBookings(prev => prev.filter(b => b.id !== bookingId))
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert(isZh ? '删除失败' : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }
  const handlePay = async (booking: Booking) => {
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
                    <Video className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">{isZh ? '实时咨询' : 'Live Consults'}</p>
                    <p className="text-2xl font-bold">
                      {bookings.filter(b => b.payment_status === 'paid').length}
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
                    return (
                      <div key={booking.id} className="border rounded-lg p-4 hover:bg-stone-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">{isZh ? master.nameCn : master.name}</span>
                              {getStatusBadge(booking.status, booking.payment_status)}
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
                          </div>
                          <div className="flex flex-col gap-2 ml-4 min-w-[80px]">
                            {canEnterChat(booking) && (
                              <Link href={`/chat-demo`} className="inline-flex">
                                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 w-full">
                                  <Video className="w-4 h-4 mr-1" />
                                  {isZh ? '进入聊天' : 'Chat'}
                                </Button>
                              </Link>
                            )}
                            {(booking.payment_status === 'pending' || booking.payment_status === 'pending_payment') && (
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
        </div>
      </div>
    </div>
  )
}
