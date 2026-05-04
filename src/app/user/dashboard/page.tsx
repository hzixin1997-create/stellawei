'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, MessageSquare, ArrowRight, Clock, User } from 'lucide-react'
import Link from 'next/link'

// Mock 数据
const mockOrders = [
  { id: 'ORD-001', master: '张易桦', service: '八字精批', status: 'completed', amount: 9.9, date: '2024-05-04' },
  { id: 'ORD-002', master: '戊阳', service: '塔罗占卜', status: 'in_progress', amount: 9.9, date: '2024-05-03' },
]

const mockMessages = [
  { id: 'MSG-001', master: '张易桦', question: '我想了解今年的财运...', reply: '今年财运整体不错...', status: 'replied', date: '2024-05-02' },
  { id: 'MSG-002', master: '戊阳', question: '感情方面的困惑...', reply: null, status: 'pending', date: '2024-05-01' },
]

export default function UserDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 欢迎语 */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-stone-900">
            欢迎回来
          </h1>
          <p className="text-stone-600 mt-2 flex items-center gap-2">
            <User className="w-4 h-4" />
            {user?.email}
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
                  <p className="text-2xl font-bold">{mockOrders.length}</p>
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
                  <p className="text-2xl font-bold">
                    {mockMessages.filter(m => m.status === 'pending').length}
                  </p>
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
            {mockOrders.length === 0 ? (
              <p className="text-stone-500 text-center py-8">暂无订单</p>
            ) : (
              <div className="space-y-3">
                {mockOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                    <div>
                      <p className="font-medium">{order.service}</p>
                      <p className="text-sm text-stone-500">{order.master} · {order.date}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                        {order.status === 'completed' ? '已完成' : '进行中'}
                      </Badge>
                      <p className="text-violet-600 font-bold mt-1">${order.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            {mockMessages.length === 0 ? (
              <p className="text-stone-500 text-center py-8">暂无留言</p>
            ) : (
              <div className="space-y-3">
                {mockMessages.map((msg) => (
                  <div key={msg.id} className="p-3 bg-stone-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{msg.master}</p>
                      <Badge variant={msg.status === 'replied' ? 'default' : 'secondary'}>
                        {msg.status === 'replied' ? '已回复' : '待回复'}
                      </Badge>
                    </div>
                    <p className="text-sm text-stone-600 mb-2">{msg.question}</p>
                    {msg.reply && (
                      <div className="bg-white p-3 rounded border-l-2 border-violet-400">
                        <p className="text-sm">{msg.reply}</p>
                      </div>
                    )}
                    <p className="text-xs text-stone-400 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {msg.date}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
