'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertTriangle, CheckCircle, Clock, Globe, CreditCard, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface HealthData {
  sessionStates: Record<string, number>
  todayStats: {
    totalOrders: number
    paidOrders: number
    pendingOrders: number
    refundedOrders: number
    totalRevenue: number
  }
  reminderStats: {
    userRemindersSent: number
    masterRemindersSent: number
    remindersPending: number
  }
  chatStats: {
    todayMessages: number
    activeBookings: number
  }
  anomalies: {
    paidButPending: number
    syncFailed: number
    webhookFailed: number
    stalePending: number
  }
}

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const fetchHealth = async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch('/api/admin/health', {
        headers: { authorization: `Bearer ${session?.access_token || ''}` }
      })
      
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch health data')
      }
      
      setData(json)
      setLastUpdate(new Date())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // 每30秒自动刷新
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-stone-900">系统健康面板</h1>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-stone-500">
                更新: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={fetchHealth} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '刷新'}
            </Button>
            <Link href="/admin/orders" className="text-sm text-stone-600 hover:text-stone-900">
              ← 订单管理
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* 异常检测 */}
            {(data.anomalies.paidButPending > 0 || data.anomalies.syncFailed > 0 || data.anomalies.webhookFailed > 0 || data.anomalies.stalePending > 0) && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>支付异常检测</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-stone-600">支付成功未确认: </span>
                    <span className="font-bold text-red-600">{data.anomalies.paidButPending}</span>
                  </div>
                  <div>
                    <span className="text-stone-600">同步失败: </span>
                    <span className="font-bold text-red-600">{data.anomalies.syncFailed}</span>
                  </div>
                  <div>
                    <span className="text-stone-600">Webhook 失败: </span>
                    <span className="font-bold text-red-600">{data.anomalies.webhookFailed}</span>
                  </div>
                  <div>
                    <span className="text-stone-600">超时未同步: </span>
                    <span className="font-bold text-orange-600">{data.anomalies.stalePending}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 统计卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-stone-600">今日订单</span>
                  </div>
                  <p className="text-xl font-bold mt-1">{data.todayStats.totalOrders}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-stone-600">已支付</span>
                  </div>
                  <p className="text-xl font-bold mt-1">{data.todayStats.paidOrders}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-stone-600">待支付</span>
                  </div>
                  <p className="text-xl font-bold mt-1">{data.todayStats.pendingOrders}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-violet-600" />
                    <span className="text-sm text-stone-600">总收入</span>
                  </div>
                  <p className="text-xl font-bold mt-1">${data.todayStats.totalRevenue.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Session State 分布 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">订单状态分布</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(data.sessionStates).map(([state, count]) => (
                    <Badge key={state} className="text-sm">
                      {state}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 提醒统计 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">提醒系统</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-stone-500">用户提醒已发: </span>
                    <span className="font-medium">{data.reminderStats.userRemindersSent}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">师傅提醒已发: </span>
                    <span className="font-medium">{data.reminderStats.masterRemindersSent}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">待发送: </span>
                    <span className="font-medium">{data.reminderStats.remindersPending}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 聊天统计 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">聊天系统</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-stone-500">今日消息: </span>
                    <span className="font-medium">{data.chatStats.todayMessages}</span>
                  </div>
                  <div>
                    <span className="text-stone-500">活跃咨询: </span>
                    <span className="font-medium">{data.chatStats.activeBookings}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
