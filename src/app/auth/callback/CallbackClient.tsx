'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  
  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const type = searchParams.get('type')
      const next = searchParams.get('next') ?? '/dashboard'
      
      const supabase = createClient()
      
      // Handle OAuth PKCE flow (Google login, etc.)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        
        if (error) {
          setError('登录验证失败，请重试')
          setTimeout(() => {
            router.push('/auth/login')
          }, 3000)
        } else {
          router.push(next)
        }
        return
      }
      
      // Handle email confirmation or magic link
      // Supabase handles the session automatically via hash fragment
      // We just need to check if user is now authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        setError('验证失败，请重试')
        setTimeout(() => {
          router.push('/auth/login')
        }, 3000)
        return
      }
      
      if (session) {
        // User is authenticated, redirect to dashboard
        router.push(next)
      } else {
        // No session yet, wait a moment and check again
        // This handles the race condition where hash fragment is still being processed
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (retrySession) {
            router.push(next)
          } else {
            router.push('/auth/login')
          }
        }, 1000)
      }
    }
    
    handleCallback()
  }, [searchParams, router])
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-red-200 p-8 text-center">
          <p className="text-red-600">{error}</p>
          <p className="text-stone-500 mt-2">正在跳转...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-stone-200/50 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-100 mb-4">
          <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-stone-700">正在登录...</p>
      </div>
    </div>
  )
}
