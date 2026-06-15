'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, ArrowLeft, Sparkles, ArrowRight } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isZh, setIsZh] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
      } else {
        setMessage(isZh 
          ? '重置邮件已发送，请检查邮箱并点击链接' 
          : 'Reset email sent. Please check your inbox and click the link.')
      }
    } catch (e: any) {
      setError(e.message || 'Failed to send reset email')
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
                {isZh ? '重置密码' : 'Reset Password'}
              </h1>
              <p className="text-white/50 mt-2">
                {isZh ? '输入邮箱，我们将发送重置链接' : 'Enter your email and we will send a reset link'}
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
                <Label htmlFor="email" className="text-white/70">
                  {isZh ? '邮箱地址' : 'Email'}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-white/5 border-white/10 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !!message}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-medium rounded-xl"
              >
                {isLoading ? (
                  isZh ? '发送中...' : 'Sending...'
                ) : (
                  <>
                    {isZh ? '发送重置链接' : 'Send Reset Link'}
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
