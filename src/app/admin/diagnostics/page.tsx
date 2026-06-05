'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertTriangle, CheckCircle, Clock, MessageSquare, RefreshCcw } from 'lucide-react'
import Link from 'next/link'

interface DiagnosticsData {
  booking: any
  computed: {
    sessionState: string
    countdownSeconds: number
    isExpired: boolean
    serverTime: string
    canBook: boolean | null
    canReschedule: boolean | null
  }
  reminders: {
    userReminderSent: boolean
    masterReminderSent: boolean
    reminderRetryCount: number
    lastReminderAttempt: string | null
    reminderError: string | null
  }
  events: any[]
  rescheduleHistory: any[]
  auditLogs: any[]
  stats: {
    messageCount: number
  }
}

export default function DiagnosticsPage() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('id')
  
  const [data, setData] = useState<DiagnosticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inputId, setInputId] = useState(bookingId || '')

  const fetchDiagnostics = async (id: string) => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(`/api/admin/bookings/${id}/diagnostics`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` }
      })
      
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch diagnostics')
      }
      
      setData(json.diagnostics)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bookingId) {
      fetchDiagnostics(bookingId)
    }
  }, [bookingId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-stone-900">订单诊断工具</h1>
          <Link href="/admin/orders" className="text-sm text-stone-600 hover:text-stone-900">
            ← 返回订单管理
          </Link>
        </div>

        {/* 查询输入 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                placeholder="输入订单ID (UUID前8位也可)"
                className="flex-1 px-3 py-2 border border-stone-200 rounded-md text-sm"
              />
              <Button
                onClick={() => fetchDiagnostics(inputId)}
                disabled={loading || !inputId.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '诊断'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4 text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-4">
            {/* 订单基本信息 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  订单基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-stone-500">ID:</span> {data.booking.id?.slice(0, 8)}</div>
                  <div><span className="text-stone-500">状态:</span> <Badge>{data.booking.status}</Badge></div>
                  <div><span className="text-stone-500">支付:</span> <Badge className={data.booking.payment_status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'}>{data.booking.payment_status}</Badge></div>
                  <div><span className="text-stone-500">金额:</span> ${data.booking.total_amount}</div>
                  <div><span className="text-stone-500">师傅:</span> {data.booking.master_id}</div>
                  <div><span className="text-stone-500">用户:</span> {data.booking.user_id?.slice(0, 12)}...</div>
                  <div><span className="text-stone-500">时间:</span> {data.booking.scheduled_date} {data.booking.scheduled_time}</div>
                  <div><span className="text-stone-500">时区:</span> {data.booking.timezone || 'UTC'}</div>
                </div>
              </CardContent>
            </Card>

            {/* 计算状态 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  计算状态
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-stone-500">SessionState:</span> <Badge className="bg-violet-100">{data.computed.sessionState}</Badge></div>
                  <div><span className="text-stone-500">倒计时:</span> {data.computed.countdownSeconds}s</div>
                  <div><span className="text-stone-500">已过期:</span> {data.computed.isExpired ? '是' : '否'}</div>
                  <div><span className="text-stone-500">可预约:</span> {data.computed.canBook === null ? 'N/A' : data.computed.canBook ? '是' : '否'}</div>
                  <div><span className="text-stone-500">可改期:</span> {data.computed.canReschedule === null ? 'N/A' : data.computed.canReschedule ? '是' : '否'}</div>
                  <div><span className="text-stone-500">服务器时间:</span> {new Date(data.computed.serverTime).toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>

            {/* 提醒状态 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4 text-amber-600" />
                  提醒状态
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-stone-500">用户提醒:</span> {data.reminders.userReminderSent ? '✅ 已发送' : '❌ 未发送'}</div>
                  <div><span className="text-stone-500">师傅提醒:</span> {data.reminders.masterReminderSent ? '✅ 已发送' : '❌ 未发送'}</div>
                  <div><span className="text-stone-500">重试次数:</span> {data.reminders.reminderRetryCount}</div>
                  <div><span className="text-stone-500">最后尝试:</span> {data.reminders.lastReminderAttempt ? new Date(data.reminders.lastReminderAttempt).toLocaleString() : '无'}</div>
                  {data.reminders.reminderError && (
                    <div className="col-span-2 text-red-600">错误: {data.reminders.reminderError}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 消息统计 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-600" />
                  消息统计
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm">消息数: {data.stats.messageCount}</p>
              </CardContent>
            </Card>

            {/* 事件日志 */}
            {data.events.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">事件日志 ({data.events.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-1 text-xs">
                    {data.events.map((event: any, idx: number) => (
                      <div key={idx} className="flex gap-2 p-1 bg-stone-50 rounded">
                        <span className="text-stone-400">{new Date(event.created_at).toLocaleString()}</span>
                        <span className="font-medium">{event.event_type}</span>
                        <span className="text-stone-600">{event.event_data?.from} → {event.event_data?.to}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 改期历史 */}
            {data.rescheduleHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">改期历史 ({data.rescheduleHistory.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-1 text-xs">
                    {data.rescheduleHistory.map((h: any, idx: number) => (
                      <div key={idx} className="flex gap-2 p-1 bg-stone-50 rounded">
                        <span className="text-stone-400">{new Date(h.created_at).toLocaleString()}</span>
                        <span className="font-medium">{h.changed_by}</span>
                        <span>{h.old_scheduled_date} {h.old_scheduled_time} → {h.new_scheduled_date} {h.new_scheduled_time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 审计日志 */}
            {data.auditLogs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">审计日志 ({data.auditLogs.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="space-y-1 text-xs">
                    {data.auditLogs.map((log: any, idx: number) => (
                      <div key={idx} className="flex gap-2 p-1 bg-stone-50 rounded">
                        <span className="text-stone-400">{new Date(log.created_at).toLocaleString()}</span>
                        <span className="font-medium">{log.action}</span>
                        <span className="text-stone-600">{log.performed_by_email}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
