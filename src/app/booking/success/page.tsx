'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Clock, CreditCard, MessageCircle, Copy, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function BookingSuccessContent() {
  const { t, i18n } = useTranslation()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id')
  
  const [booking, setBooking] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const isZh = i18n.language === 'zh'

  // PayPal.Me 链接（黄子馨的 PayPal 账号）
  // 注意：需要替换为实际的 PayPal.Me 用户名
  const paypalMeLink = booking 
    ? `https://paypal.me/yourpaypalname/${booking.total_amount}USD`
    : '#'

  useEffect(() => {
    if (!bookingId) {
      setIsLoading(false)
      return
    }

    const fetchBooking = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id (name, nameCn, duration_minutes),
          masters:master_id (display_name, display_nameCn)
        `)
        .eq('id', bookingId)
        .single()

      if (!error && data) {
        setBooking(data)
      }
      setIsLoading(false)
    }

    fetchBooking()
  }, [bookingId])

  const handleCopyBookingId = () => {
    if (bookingId) {
      navigator.clipboard.writeText(bookingId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-stone-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          {isZh ? '加载中...' : 'Loading...'}
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-stone-900 mb-4">
            {isZh ? '未找到预约信息' : 'Booking not found'}
          </h1>
          <Link href="/">
            <Button className="bg-violet-600 hover:bg-violet-700">
              {isZh ? '返回首页' : 'Back to Home'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const orderNumber = `CH-${booking.id.slice(0, 8).toUpperCase()}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 成功提示 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">
            {isZh ? '预约已创建！' : 'Booking Created!'}
          </h1>
          <p className="text-stone-600 mt-2">
            {isZh 
              ? '请完成付款以确认您的预约。我们已收到您的预约申请，付款确认后会发送确认邮件。'
              : 'Please complete payment to confirm your booking. We have received your request and will send a confirmation email once payment is verified.'
            }
          </p>
        </div>

        {/* 订单详情 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isZh ? '订单详情' : 'Order Details'}</span>
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                <Clock className="w-3 h-3 mr-1" />
                {isZh ? '待付款' : 'Pending Payment'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-stone-600">{isZh ? '订单号' : 'Order Number'}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{orderNumber}</span>
                <Button variant="ghost" size="sm" onClick={handleCopyBookingId} className="h-8 w-8 p-0">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {copied && (
              <p className="text-xs text-green-600 text-right">{isZh ? '已复制' : 'Copied!'}</p>
            )}
            
            <div className="flex justify-between">
              <span className="text-stone-600">{isZh ? '师傅' : 'Master'}</span>
              <span className="font-medium">
                {isZh 
                  ? (booking.masters?.display_nameCn || booking.masters?.display_name)
                  : booking.masters?.display_name
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">{isZh ? '服务' : 'Service'}</span>
              <span className="font-medium">
                {isZh 
                  ? (booking.services?.nameCn || booking.services?.name)
                  : booking.services?.name
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-600">{isZh ? '时间' : 'Time'}</span>
              <span className="font-medium">
                {booking.scheduled_date} {booking.scheduled_time}
              </span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>{isZh ? '总计' : 'Total'}</span>
                <span className="text-violet-600">
                  ${booking.total_amount}
                </span>
              </div>
              {booking.is_first_time && (
                <p className="text-xs text-violet-600 text-right mt-1">
                  {isZh ? '✨ 已应用首次用户优惠' : '✨ First-time user discount applied'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 支付方式 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {isZh ? '选择支付方式' : 'Choose Payment Method'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PayPal */}
            <div className="p-4 border rounded-xl hover:border-blue-400 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">Pay</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">PayPal</h3>
                    <p className="text-sm text-stone-500">
                      {isZh ? '信用卡 / 借记卡 / PayPal余额' : 'Credit Card / Debit Card / PayPal Balance'}
                    </p>
                  </div>
                </div>
                <Link href={paypalMeLink} target="_blank">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    {isZh ? '去付款' : 'Pay'}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-stone-400">
                {isZh 
                  ? '点击后跳转到 PayPal 完成付款。付款后请截图保存交易号。'
                  : 'You will be redirected to PayPal to complete payment. Please save the transaction ID.'
                }
              </p>
            </div>

            {/* 其他方式 */}
            <div className="p-4 border rounded-xl hover:border-violet-400 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {isZh ? '联系客服' : 'Contact Support'}
                  </h3>
                  <p className="text-sm text-stone-500">
                    {isZh ? '微信 / WhatsApp / 银行转账' : 'WeChat / WhatsApp / Bank Transfer'}
                  </p>
                </div>
              </div>
              <div className="text-sm text-stone-600 space-y-1">
                <p>
                  {isZh ? '付款后请联系客服确认：' : 'After payment, please contact us to confirm:'}
                </p>
                <p className="font-mono bg-stone-100 px-2 py-1 rounded">
                  WhatsApp: +852 XXXX XXXX
                </p>
                <p className="font-mono bg-stone-100 px-2 py-1 rounded">
                  WeChat: your-wechat-id
                </p>
                <p className="text-xs text-stone-400 mt-2">
                  {isZh 
                    ? '（请提供订单号和付款截图以便确认）'
                    : '(Please provide order number and payment screenshot for verification)'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 底部提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <p className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {isZh 
                ? '您的预约已预留 24 小时。请在 24 小时内完成付款，否则预约将自动取消。'
                : 'Your booking is held for 24 hours. Please complete payment within 24 hours or it will be automatically cancelled.'
              }
            </span>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/">
            <Button variant="outline">
              {isZh ? '返回首页' : 'Back to Home'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-stone-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading...
        </div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  )
}
