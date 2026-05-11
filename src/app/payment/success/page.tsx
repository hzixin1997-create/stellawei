"use client";

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, Loader2 } from "lucide-react"

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const orderId = searchParams.get("order_id")
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (sessionId && orderId) {
      // 给 Webhook 一点时间处理
      setTimeout(() => {
        setVerifying(false)
        setVerified(true)
      }, 1500)
    } else {
      setVerifying(false)
    }
  }, [sessionId, orderId])

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

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl border border-stone-200 p-8">
          <CheckCircle size={48} className="text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-stone-800 mb-2">付款成功！</h1>
          <p className="text-stone-500 mb-6">
            您的订单已确认。点击下面按钮查看订单详情。
          </p>

          <div className="space-y-3">
            {orderId && (
              <Link
                href={`/order/${orderId}`}
                className="block w-full py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors"
              >
                查看订单详情
              </Link>
            )}
            <Link
              href="/orders"
              className="block w-full py-3 bg-stone-100 text-stone-700 rounded-lg font-medium hover:bg-stone-200 transition-colors"
            >
              查看全部订单
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
