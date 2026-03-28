'use client'

import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Sparkles, User, LogOut, Home } from 'lucide-react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'

export default function DashboardPage() {
  const { user, signOut, isLoading } = useAuth()
  const router = useRouter()
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* Header */}
      <nav className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Logo - not clickable */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-violet-800">
                <Sparkles className="w-5 h-5 text-white m-1.5" />
              </div>
              <span className="text-xl font-serif font-bold text-stone-900">{isZh ? '星位' : 'StellaWei'}</span>
            </div>
            
            {/* Back to Home */}
            <Link 
              href="/"
              className="flex items-center space-x-2 text-stone-600 hover:text-stellawei-purple transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">{isZh ? '返回主页' : 'Home'}</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <div className="flex items-center space-x-2 text-sm text-stone-600">
              <User className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              {isZh ? '退出登录' : 'Sign Out'}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8">
          <h1 className="text-3xl font-serif font-bold text-stone-900 mb-4">
            {isZh ? '欢迎回来！' : 'Welcome Back!'}
          </h1>
          <p className="text-stone-600 mb-8">
            {isZh 
              ? '欢迎回到星位，愿星光指引你的方向。更多专属功能正在路上，敬请期待 ✨'
              : 'Welcome back to StellaWei. May the stars guide your path. More features coming soon ✨'}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-stone-50 rounded-xl border border-stone-200">
              <h3 className="font-semibold text-stone-900 mb-2">{isZh ? '预约咨询' : 'Book Consultation'}</h3>
              <p className="text-sm text-stone-600">{isZh ? '与专业命理师傅一对一咨询' : 'One-on-one consultation with professional masters'}</p>
            </div>
            <div className="p-6 bg-stone-50 rounded-xl border border-stone-200">
              <h3 className="font-semibold text-stone-900 mb-2">{isZh ? '订单记录' : 'Order History'}</h3>
              <p className="text-sm text-stone-600">{isZh ? '查看历史订单和预约' : 'View past orders and appointments'}</p>
            </div>
            <div className="p-6 bg-stone-50 rounded-xl border border-stone-200">
              <h3 className="font-semibold text-stone-900 mb-2">{isZh ? '个人设置' : 'Settings'}</h3>
              <p className="text-sm text-stone-600">{isZh ? '管理账户信息和偏好' : 'Manage account info and preferences'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
