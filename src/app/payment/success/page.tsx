'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [bookingId, setBookingId] = useState('')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setVerifying(false)
        setError('缺少支付会话ID')
        return
      }

      try {
        // 1. 调用后端API验证Stripe支付状态并更新booking
        const res = await fetch('/api/stripe/success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || '支付验证失败')
        }

        setBookingId(data.bookingId || '')
        setVerified(true)
      } catch (err: any) {
        console.error('Payment verification error:', err)
        setError(err.message || '支付验证失败，请稍后查看订单状态')
      } finally {
        setVerifying(false)
      }
    }

    verifyPayment()
  }, [sessionId])

  if (verifying) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-amber-700 mx-auto mb-4 animate-spin" />
          <p className="text-stone-600">正在确认付款...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl border border-stone-200 p-8">
            <AlertTriangle size={48} className="text-amber-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-stone-800 mb-2">需要确认</h1>
            <p className="text-stone-500 mb-6">{error}</p>
            <Link
              href="/user/dashboard"
              className="block w-full py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors"
            >
              前往我的订单
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl border border-stone-200 p-8">
          <CheckCircle size={48} className="text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-stone-800 mb-2">付款成功！</h1>
          <p className="text-stone-500 mb-6">
            您的预约已确认。点击下面按钮查看订单详情。
          </p>

          <div className="space-y-3">
            <Link
              href="/user/dashboard"
              className="block w-full py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors"
            >
              查看我的订单
            </Link>
            <Link
              href="/"
              className="block w-full py-3 text-stone-500 hover:text-stone-700 transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-amber-700 mx-auto mb-4 animate-spin" />
          <p className="text-stone-600">正在确认付款...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
