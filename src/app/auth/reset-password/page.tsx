'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, ArrowLeft, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isZh, setIsZh] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // 检查是否有有效的 recovery token
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      // 密码重置时 Supabase 会在 URL 中设置临时 session
      if (!data.session) {
        setError(isZh 
          ? '链接已过期或无效，请重新申请重置密码' 
          : 'Link expired or invalid. Please request a new reset.')
      }
    }
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    if (password !== confirmPassword) {
      setError(isZh ? '两次输入的密码不一致' : 'Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError(isZh ? '密码至少需要8位' : 'Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
      } else {
        setMessage(isZh 
          ? '密码重置成功！正在跳转登录页...' 
          : 'Password reset successfully! Redirecting to login...')
        setTimeout(() => {
          router.push('/auth/login')
        }, 2000)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex flex-col">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10">
        <Link 
          href="/auth/login"
          className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{isZh ? '返回登录' : 'Back to Login'}</span>
        </Link>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-black/40 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif font-semibold text-white">
                {isZh ? '设置新密码' : 'Set New Password'}
              </h1>
              <p className="text-white/50 mt-2">
                {isZh ? '请输入您的新密码' : 'Please enter your new password'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-4 rounded-xl border-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Success */}
            {message && (
              <div className="mb-4 p-4 rounded-xl border-green-500/10 border border-green-500/30 text-green-300 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70">
                  {isZh ? '新密码' : 'New Password'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isZh ? '至少8位字符' : 'At least 8 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-white/5 border-white/10 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 focus:outline-none"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white/70">
                  {isZh ? '确认密码' : 'Confirm Password'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isZh ? '再次输入密码' : 'Enter password again'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-white/5 border-white/10 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !!message}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-medium rounded-xl"
              >
                {isLoading ? (
                  isZh ? '重置中...' : 'Resetting...'
                ) : (
                  <>
                    {isZh ? '重置密码' : 'Reset Password'}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
