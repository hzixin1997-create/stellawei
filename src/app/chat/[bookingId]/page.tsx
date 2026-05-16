'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  User,
  Crown,
  X,
} from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  booking_id: string
  sender_id: string
  sender_type: 'user' | 'master'
  sender_name: string
  content: string | null
  image_url: string | null
  created_at: string
}

interface BookingInfo {
  id: string
  master_id: string
  service_id: string
  status: string
  payment_status: string
  scheduled_date: string
  scheduled_time: string
  total_amount: number
}

const services: Record<string, { name: string; nameCn: string }> = {
  tarot: { name: 'Tarot Reading', nameCn: '塔罗占卜' },
  spiritual: { name: 'Spiritual Guidance', nameCn: '灵性指引' },
  qimen: { name: 'Qi Men Dun Jia', nameCn: '奇门遁甲' },
  liuyao: { name: 'Liu Yao Divination', nameCn: '六爻占卜' },
  bazi: { name: 'BaZi Analysis', nameCn: '八字分析' },
  fengshui: { name: 'Feng Shui Consultation', nameCn: '风水咨询' },
}

const masters: Record<string, { name: string; nameCn: string }> = {
  'master-luna': { name: 'Master Luna', nameCn: '卢娜师傅' },
  'zhang-yihua': { name: 'Master Zhang Yihua', nameCn: '张易桦' },
  'wu-yang': { name: 'Master Wu Yang', nameCn: '戊阳' },
}

export default function ChatPage({ params }: { params: { bookingId: string } }) {
  const router = useRouter()
  const { bookingId } = params
  const [messages, setMessages] = useState<Message[]>([])
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isZh, setIsZh] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isMaster, setIsMaster] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 加载历史消息和 booking 信息
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      // 判断是否是师傅
      const masterRes = await fetch('/api/master/profile', {
        headers: { authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}` },
      })
      if (masterRes.ok) {
        const masterJson = await masterRes.json()
        if (masterJson.master) {
          setIsMaster(true)
        }
      }

      // 获取 booking 信息
      const { data: { session } } = await supabase.auth.getSession()
      const bookingRes = await fetch(`/api/chat/${bookingId}/messages`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (bookingRes.ok) {
        const json = await bookingRes.json()
        setMessages(json.messages || [])
      }

      // 获取 booking 详情
      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
      if (bookingData) {
        setBooking(bookingData)
      }

      setIsLoading(false)
    }

    loadData()
  }, [bookingId, router, supabase])

  // 订阅 Supabase Realtime 实时消息
  useEffect(() => {
    if (!bookingId) return

    const channel = supabase
      .channel(`chat-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload: any) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            // 避免重复添加
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId, supabase])

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return

    setIsSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/chat/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ content: inputValue.trim() }),
      })

      if (res.ok) {
        setInputValue('')
        // 本地乐观更新（实际上 Realtime 会推送回来）
        const json = await res.json()
        if (json.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === json.message.id)) return prev
            return [...prev, json.message]
          })
        }
      } else {
        const err = await res.json()
        alert(err.error || 'Send failed')
      }
    } catch (err) {
      console.error('Send error:', err)
    } finally {
      setIsSending(false)
    }
  }

  // 发送图片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      // 上传到 Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${bookingId}/${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      // 获取 public URL
      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName)
      const imageUrl = urlData.publicUrl

      // 发送带图片的消息
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/chat/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ image_url: imageUrl }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Image send failed')
      }
    } catch (err: any) {
      console.error('Image upload error:', err)
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 结束咨询
  const handleComplete = async () => {
    if (!confirm(isZh ? '确定要结束这次咨询吗？' : 'Are you sure you want to complete this consultation?')) {
      return
    }
    setIsCompleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/chat/${bookingId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
      })

      if (res.ok) {
        router.push(isMaster ? '/master/dashboard' : '/user/dashboard')
      } else {
        const err = await res.json()
        alert(err.error || 'Complete failed')
      }
    } catch (err) {
      console.error('Complete error:', err)
    } finally {
      setIsCompleting(false)
    }
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString(isZh ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  const master = booking ? masters[booking.master_id] : null
  const service = booking ? services[booking.service_id] : null
  const canComplete = booking?.status === 'in_progress'

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex flex-col">
      {/* 顶部栏 */}
      <div className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href={isMaster ? '/master/dashboard' : '/user/dashboard'}
            className="flex items-center text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">{isZh ? '返回' : 'Back'}</span>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-bold text-stone-900">
              {isZh ? service?.nameCn : service?.name}
            </h1>
            <p className="text-xs text-stone-500">
              {isZh ? master?.nameCn : master?.name} · {booking?.scheduled_date} {booking?.scheduled_time}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canComplete && (
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={handleComplete}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {isZh ? '结束' : 'Complete'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto py-4 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-stone-400">
                {isZh ? '咨询即将开始，请先向师傅描述您的问题' : 'Consultation will begin soon. Please describe your question.'}
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe =
              (msg.sender_type === 'user' && !isMaster) ||
              (msg.sender_type === 'master' && isMaster)
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    isMe
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white border border-stone-200 text-stone-800 rounded-bl-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.sender_type === 'master' ? (
                      <Crown className="w-3 h-3" />
                    ) : (
                      <User className="w-3 h-3" />
                    )}
                    <span className={`text-xs font-medium ${isMe ? 'text-violet-100' : 'text-stone-500'}`}>
                      {msg.sender_name}
                    </span>
                    <span className={`text-xs ${isMe ? 'text-violet-200' : 'text-stone-400'}`}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  {msg.content && <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                  {msg.image_url && (
                    <img
                      src={msg.image_url}
                      alt="Chat image"
                      className="mt-2 max-w-full rounded-lg cursor-pointer"
                      onClick={() => window.open(msg.image_url!, '_blank')}
                    />
                  )}
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t border-stone-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </Button>
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={isZh ? '输入消息...' : 'Type a message...'}
              className="pr-10"
              disabled={isSending}
            />
          </div>
          <Button
            className="shrink-0 bg-violet-600 hover:bg-violet-700"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
