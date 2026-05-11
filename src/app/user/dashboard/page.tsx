'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, MessageSquare, ArrowRight, Clock, User, Home, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function UserDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      setIsLoading(false)
    }
    getUser()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-stone-600 hover:text-stone-900">
            <Home className="w-5 h-5 mr-2" />
            <span className="font-medium">返回首页</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <User className="w-4 h-4" />
              {user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      </div>

      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 欢迎语 */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-stone-900">
              欢迎回来
            </h1>
            <p className="text-stone-600 mt-2">
              这里您可以查看所有订单和留言记录
            </p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">我的订单</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">待回复留言</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 快速操作 */}
          <div className="mb-6">
            <Link href="/consultation-type">
              <Button className="w-full bg-violet-600 hover:bg-violet-700 h-12">
                发起新的咨询
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* 我的订单 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                我的订单
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-stone-500 text-center py-8">暂无订单</p>
            </CardContent>
          </Card>

          {/* 我的留言 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                我的留言
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-stone-500 text-center py-8">暂无留言</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
