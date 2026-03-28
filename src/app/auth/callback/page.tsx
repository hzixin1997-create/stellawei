import { Suspense } from 'react'
import CallbackClient from './CallbackClient'

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/50 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 mb-4">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-stone-700">正在登录...</p>
        </div>
      </div>
    }>
      <CallbackClient />
    </Suspense>
  )
}
