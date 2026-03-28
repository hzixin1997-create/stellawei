import { Suspense } from 'react'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex flex-col">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          {/* Back to Home */}
          <Link 
            href="/"
            className="flex items-center space-x-2 text-stone-600 hover:text-stellawei-purple transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">返回主页</span>
          </Link>
          
          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>
        
        {/* Auth Card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Suspense fallback={<div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/50 p-8 text-center">加载中...</div>}>
            <AuthCard />
          </Suspense>
        </div>
      </div>
    </AuthProvider>
  )
}
