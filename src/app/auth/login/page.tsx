'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [isZh, setIsZh] = useState(true)

  useEffect(() => {
    const lang = localStorage.getItem('language') || 'zh'
    setIsZh(lang === 'zh')
  }, [])

  return (
    <AuthProvider>
      <div className="dark min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex flex-col">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          {/* Back to Home */}
        <Link 
            href="/"
            className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">{isZh ? '返回主页' : 'Back to Home'}</span>
          </Link>
          
          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>
        
        {/* Auth Card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <Suspense fallback={<div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/50 p-8 text-center">{isZh ? '加载中...' : 'Loading...'}</div>}>
            <AuthCard />
          </Suspense>
        </div>
      </div>
    </AuthProvider>
  )
}
