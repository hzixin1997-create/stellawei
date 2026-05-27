"use client";

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useAuth } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sparkles, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react'

// 路由映射：根据邮箱决定登录后跳到哪里
const ROUTE_MAP: Record<string, string> = {
  'qimenyihua@gmail.com': '/master/dashboard',
  'mshoucangjia@gmail.com': '/master/dashboard',
  'lunalintarot@163.com': '/master/dashboard',
  'hzixin1997@gmail.com': '/admin/dashboard',
}

function getRedirectByEmail(email: string): string {
  return ROUTE_MAP[email.trim().toLowerCase()] || '/user/dashboard'
}

export function AuthCard() {
  const [activeTab, setActiveTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)
  
  const { signIn, signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, i18n } = useTranslation()
  const redirect = searchParams.get('redirect') || '/user/dashboard'
  const isZh = i18n.language === 'zh'

  // 真正防连点：ref 同步阻止并发提交（state 有延迟）
  const submittingRef = useRef(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setIsLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        setError(error.message)
      } else {
        const target = getRedirectByEmail(email)
        // 使用硬跳转避免客户端路由卡顿
        window.location.href = target
      }
    } finally {
      setIsLoading(false)
      submittingRef.current = false
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const { error: signUpError } = await signUp(email, password, { full_name: fullName })
      
      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // 注册成功后直接自动登录
      const { error: signInError } = await signIn(email, password)
      
      if (signInError) {
        setError(signInError.message)
        return
      }

      // 登录成功，直接跳转
      const target = getRedirectByEmail(email)
      window.location.href = target
    } finally {
      setIsLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/50 p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-stone-900">
            {isZh ? '出海命理' : 'StellaWei'}
          </h1>
          <p className="text-stone-500 mt-2">
            {isZh ? '探索命运的奥秘，连接东西方的智慧' : 'Explore destiny, connect Eastern & Western wisdom'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm">
            {message}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="login">{isZh ? '登录' : 'Sign In'}</TabsTrigger>
            <TabsTrigger value="register">{isZh ? '注册' : 'Sign Up'}</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-stone-700">
                  {isZh ? '邮箱地址' : 'Email'}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-stone-50 border-stone-200 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-stone-700">
                    {isZh ? '密码' : 'Password'}
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-violet-600 hover:text-violet-700"
                  >
                    {isZh ? '忘记密码？' : 'Forgot password?'}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-stone-50 border-stone-200 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-medium rounded-xl"
              >
                {isLoading ? (
                  isZh ? '登录中...' : 'Signing in...'
                ) : (
                  <>
                    {isZh ? '登录' : 'Sign In'}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-stone-700">
                  {isZh ? '姓名' : 'Full Name'}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={isZh ? '你的名字' : 'Your name'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 h-12 bg-stone-50 border-stone-200 focus:border-violet-500 focus:ring-violet-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registerEmail" className="text-stone-700">
                  {isZh ? '邮箱地址' : 'Email'}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    id="registerEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-stone-50 border-stone-200 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registerPassword" className="text-stone-700">
                  {isZh ? '密码' : 'Password'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                  <Input
                    id="registerPassword"
                    type={showRegisterPassword ? 'text' : 'password'}
                    placeholder={isZh ? '至少8位字符' : 'At least 8 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-stone-50 border-stone-200 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showRegisterPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-medium rounded-xl"
              >
                {isLoading ? (
                  isZh ? '注册中...' : 'Creating account...'
                ) : (
                  <>
                    {isZh ? '创建账户' : 'Create Account'}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-stone-500">
          {isZh ? '继续即表示您同意我们的' : 'By continuing, you agree to our'}{' '}
          <Link href="/terms" className="text-violet-600 hover:text-violet-700">
            {isZh ? '服务条款' : 'Terms'}
          </Link>
          {' '}{isZh ? '和' : 'and'}{' '}
          <Link href="/privacy" className="text-violet-600 hover:text-violet-700">
            {isZh ? '隐私政策' : 'Privacy Policy'}
          </Link>
        </p>
      </div>
    </div>
  )
}
