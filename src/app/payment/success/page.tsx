'use client'

import { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const POLL_INTERVAL = 2000 // 2 seconds
const MAX_POLL_COUNT = 15 // 30 seconds total

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [pollCount, setPollCount] = useState(0)
  const [pollProgress, setPollProgress] = useState(0)

  const startPolling = useCallback((bid: string) => {
    let count = 0
    const interval = setInterval(async () => {
      count++
      setPollCount(count)
      setPollProgress(Math.round((count / MAX_POLL_COUNT) * 100))
      
      if (count > MAX_POLL_COUNT) {
        clearInterval(interval)
        setVerifying(false)
        return
      }

      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        const res = await fetch('/api/sync-payment', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            authorization: `Bearer ${session?.access_token || ''}`,
          },
          credentials: 'include',
          body: JSON.stringify({ bookingId: bid }),
        })
        
        if (!res.ok) {
          // 继续轮询
          return
        }
        
        const data = await res.json()
        
        if (data.synced && data.payment_status === 'paid') {
          clearInterval(interval)
          setVerified(true)
          setPaymentStatus('paid')
          // 短暂显示成功状态后自动跳转
          setTimeout(() => {
            router.push('/user/dashboard')
          }, 1500)
        } else if (data.payment_status === 'paid') {
          clearInterval(interval)
          setVerified(true)
          setPaymentStatus('paid')
          setTimeout(() => {
            router.push('/user/dashboard')
          }, 1500)
        }
      } catch (err) {
        // 继续轮询，不中断
        console.log('[PaymentPoll] poll error, continuing:', err)
      }
    }, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [router])

  useEffect(() => {
    let intervalCleanup: (() => void) | null = null
    let isMounted = true
    
    const run = async () => {
      if (!sessionId) {
        if (isMounted) {
          setVerifying(false)
          setError('缺少支付会话ID')
        }
        return
      }

      try {
        const res = await fetch('/api/stripe/success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || '支付验证失败')
        }

        if (!isMounted) return

        setBookingId(data.bookingId || '')
        setPaymentStatus(data.paymentStatus || '')
        
        const isPaid = data.success || data.paymentStatus === 'paid'
        setVerified(isPaid)
        
        if (isPaid) {
          // 已支付，直接跳转
          setTimeout(() => {
            if (isMounted) router.push('/user/dashboard')
          }, 1500)
        } else if (data.bookingId) {
          // 未支付，开始轮询（Webhook 可能在同步中）
          intervalCleanup = startPolling(data.bookingId)
        } else {
          setVerifying(false)
        }
      } catch (err: any) {
        console.error('Payment verification error:', err)
        if (isMounted) {
          setError(err.message || '支付验证失败，请稍后查看订单状态')
          setVerifying(false)
        }
      }
    }

    run()
    
    return () => {
      isMounted = false
      if (intervalCleanup) intervalCleanup()
    }
  }, [sessionId, router, startPolling])

  if (verifying) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="text-amber-700 mx-auto mb-4 animate-spin" />
          <p className="text-stone-600 mb-2">
            {verified ? '支付已确认，正在跳转...' : '正在确认付款...'}
          </p>
          {!verified && pollCount > 0 && (
            <div className="w-64 mx-auto">
              <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-700 transition-all duration-300" 
                  style={{ width: `${pollProgress}%` }}
                />
              </div>
              <p className="text-xs text-stone-400 mt-2">
                已检查 {pollCount}/{MAX_POLL_COUNT} 次
              </p>
            </div>
          )}
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

  // 支付确认中（轮询超时但还没 paid）
  if (!verified && (paymentStatus === 'pending' || paymentStatus === 'pending_payment')) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl border border-stone-200 p-8">
            <Loader2 size={48} className="text-amber-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-stone-800 mb-2">支付确认中</h1>
            <p className="text-stone-500 mb-6">
              您的支付可能已成功，系统正在同步。请等待或手动刷新。
            </p>
            <div className="space-y-3">
              <Link
                href="/user/dashboard"
                className="block w-full py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors"
              >
                查看我的订单
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="block w-full py-3 text-stone-500 hover:text-stone-700 transition-colors"
              >
                刷新页面
              </button>
            </div>
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
            您的预约已确认。正在跳转到您的订单...
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
