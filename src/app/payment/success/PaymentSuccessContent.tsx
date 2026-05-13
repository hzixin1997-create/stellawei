'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowRight, Calendar, Clock, User, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase/client'

export default function PaymentSuccessContent() {
  const { t, i18n } = useTranslation()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const isZh = i18n.language === 'zh'

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!sessionId) {
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        // 先查询 payment 记录获取 booking_id
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .select('booking_id')
          .eq('stripe_session_id', sessionId)
          .single()

        if (paymentError || !payment) {
          // 尝试通过 payment_intent_id 查询
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select(`
              *,
              master:master_id (display_name),
              service:service_id (name_en, name_zh)
            `)
            .ilike('payment_intent_id', `%${sessionId}%`)
            .single()

          if (!bookingError && bookingData) {
            setBooking(bookingData)
          }
        } else {
          // 获取 booking 详情
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select(`
              *,
              master:master_id (display_name),
              service:service_id (name_en, name_zh)
            `)
            .eq('id', payment.booking_id)
            .single()

          if (!bookingError && bookingData) {
            setBooking(bookingData)
          }
        }
      } catch (error) {
        console.error('Error fetching booking details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [sessionId])

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-green-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-serif text-green-800">
              {isZh ? '支付成功！' : 'Payment Successful!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-stone-600">
              {isZh 
                ? '您的预约已确认，我们会尽快与您联系安排咨询。'
                : 'Your booking has been confirmed. We will contact you soon to arrange the consultation.'}
            </p>

            {loading ? (
              <div className="text-center py-8 text-stone-500">
                {isZh ? '加载预约详情...' : 'Loading booking details...'}
              </div>
            ) : booking ? (
              <div className="bg-stone-50 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-stone-800 mb-4">
                  {isZh ? '预约详情' : 'Booking Details'}
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-violet-600" />
                    <span className="text-stone-600">{isZh ? '师傅' : 'Master'}:</span>
                    <span className="font-medium ml-auto">{booking.master?.display_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-violet-600" />
                    <span className="text-stone-600">{isZh ? '服务' : 'Service'}:</span>
                    <span className="font-medium ml-auto">
                      {isZh ? booking.service?.name_zh : booking.service?.name_en}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-violet-600" />
                    <span className="text-stone-600">{isZh ? '日期' : 'Date'}:</span>
                    <span className="font-medium ml-auto">{formatDate(booking.scheduled_at)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-violet-600" />
                    <span className="text-stone-600">{isZh ? '时间' : 'Time'}:</span>
                    <span className="font-medium ml-auto">{booking.scheduled_time}</span>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{isZh ? '支付金额' : 'Amount Paid'}</span>
                    <span className="text-xl font-bold text-violet-600">
                      ${booking.total_amount || booking.amount}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-stone-500">
                {isZh ? '无法加载预约详情' : 'Unable to load booking details'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/user/dashboard">
                <Button className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto">
                  {isZh ? '查看我的预约' : 'View My Bookings'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  {isZh ? '返回首页' : 'Back to Home'}
                </Button>
              </Link>
            </div>

            <p className="text-center text-sm text-stone-500 mt-6">
              {isZh 
                ? '确认邮件已发送至您的邮箱，请查收。'
                : 'A confirmation email has been sent to your inbox.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
