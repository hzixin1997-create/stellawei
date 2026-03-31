'use client'

import { Suspense } from 'react'
import PaymentCancelContent from './PaymentCancelContent'

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<PaymentCancelLoading />}>
      <PaymentCancelContent />
    </Suspense>
  )
}

function PaymentCancelLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
      <div className="text-stone-600">加载中... / Loading...</div>
    </div>
  )
}
