'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield, Clock, CreditCard, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function RefundPolicyContent() {
  const { i18n } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('booking_id')
  const isZh = i18n.language === 'zh'
  
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleRefund = async () => {
    if (!agreed) {
      alert(isZh ? '请先阅读并同意退款政策' : 'Please read and agree to the refund policy')
      return
    }
    if (!bookingId) {
      alert(isZh ? '缺少订单信息' : 'Missing booking information')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${bookingId}/request-refund`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session?.access_token || ''}`,
        },
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Request failed')
      }

      alert(isZh ? '退款申请已提交，等待管理员审核处理' : 'Refund request submitted, awaiting admin review')
      router.push('/user/dashboard')
    } catch (err: any) {
      console.error('Refund error:', err)
      alert(isZh ? `申请失败: ${err.message}` : `Request failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/user/dashboard" className="inline-flex items-center text-stone-600 hover:text-stone-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isZh ? '返回订单' : 'Back to Orders'}
        </Link>

        <Card>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-serif">
              {isZh ? '退款政策' : 'Refund Policy'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* 退款政策内容 */}
            <div className="space-y-4 text-stone-700">
              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{isZh ? '退款时效' : 'Refund Timeline'}</h3>
                  <p className="text-sm text-stone-600">
                    {isZh 
                      ? '退款申请提交后，我们将在3-5个工作日内处理完毕。款项将原路退回至您的支付账户。'
                      : 'After submitting your refund request, we will process it within 3-5 business days. The refund will be returned to your original payment method.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CreditCard className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{isZh ? '退款方式' : 'Refund Method'}</h3>
                  <p className="text-sm text-stone-600">
                    {isZh 
                      ? '退款将原路退回至您当初支付的 Stripe 账户。具体到账时间取决于您的银行或支付机构。'
                      : 'Refunds will be returned to your original Stripe payment account. Actual arrival time depends on your bank or payment provider.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{isZh ? '不可退款情形' : 'Non-Refundable Cases'}</h3>
                  <ul className="text-sm text-stone-600 space-y-1 list-disc list-inside">
                    <li>{isZh ? '咨询已经开始或已完成' : 'Consultation has started or been completed'}</li>
                    <li>{isZh ? '超过预约时间24小时后申请退款' : 'Refund requested more than 24 hours after scheduled time'}</li>
                    <li>{isZh ? '用户主动取消后再次预约的订单' : 'Orders rebooked after user cancellation'}</li>
                  </ul>
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-lg">
                <p className="text-sm text-stone-600">
                  {isZh 
                    ? '如有任何疑问，请联系客服 support@stellawei.org'
                    : 'For any questions, please contact support@stellawei.org'}
                </p>
              </div>
            </div>

            {/* 确认勾选 */}
            <div className="flex items-start gap-3 pt-4 border-t">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 text-violet-600 rounded border-stone-300 focus:ring-violet-500"
              />
              <label htmlFor="agree" className="text-sm text-stone-600 cursor-pointer">
                {isZh 
                  ? '我已阅读并理解上述退款政策，确认申请退款。'
                  : 'I have read and understood the refund policy above and confirm to request a refund.'}
              </label>
            </div>

            {/* 按钮 */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/user/dashboard')}
              >
                {isZh ? '取消' : 'Cancel'}
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={handleRefund}
                disabled={submitting || !agreed}
              >
                {submitting 
                  ? (isZh ? '处理中...' : 'Processing...') 
                  : (isZh ? '确认申请退款' : 'Confirm Refund')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function RefundPolicyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    }>
      <RefundPolicyContent />
    </Suspense>
  )
}
