'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase/client'

export default function PaymentCancelContent() {
  const { t, i18n } = useTranslation()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id')
  const isZh = i18n.language === 'zh'

  useEffect(() => {
    const updateBookingStatus = async () => {
      if (!bookingId) return

      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        await fetch(`/api/bookings/${bookingId}/payment-cancel`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${session?.access_token || ''}`,
          },
        })
      } catch (error) {
        console.error('Error updating booking status:', error)
      }
    }

    updateBookingStatus()
  }, [bookingId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-orange-200 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-serif text-stone-800">
              {isZh ? '支付已取消' : 'Payment Cancelled'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-stone-600">
              {isZh 
                ? '您的支付已被取消。如果您遇到任何问题，请随时联系我们。'
                : 'Your payment has been cancelled. If you encountered any issues, please feel free to contact us.'}
            </p>

            <div className="bg-stone-50 rounded-xl p-6">
              <h3 className="font-semibold text-stone-800 mb-3">
                {isZh ? '您可以尝试以下操作：' : 'You can try the following:'}
              </h3>
              <ul className="space-y-2 text-stone-600">
                <li className="flex items-start gap-2">
                  <span className="text-violet-600">•</span>
                  {isZh 
                    ? '返回预约页面重新提交预约'
                    : 'Return to the booking page to resubmit your booking'}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600">•</span>
                  {isZh 
                    ? '检查您的支付方式是否有效'
                    : 'Check if your payment method is valid'}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-600">•</span>
                  {isZh 
                    ? '联系客服获取帮助'
                    : 'Contact customer support for assistance'}
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/booking">
                <Button className="bg-violet-600 hover:bg-violet-700 w-full sm:w-auto">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isZh ? '重新预约' : 'Try Again'}
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {isZh ? '返回首页' : 'Back to Home'}
                </Button>
              </Link>
            </div>

            <p className="text-center text-sm text-stone-500 mt-6">
              {isZh 
                ? '如有任何问题，请联系 support@stellawei.com'
                : 'For any questions, please contact support@stellawei.com'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
