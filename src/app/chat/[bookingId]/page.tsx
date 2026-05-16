'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
  User,
  Crown,
  Clock,
  Star,
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
  scheduled_at: string
  total_amount: number
  duration_minutes: number
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

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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
  
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [isExpired, setIsExpired] = useState(false)
  const [consultStatus, setConsultStatus] = useState<'not_started' | 'in_progress' | 'ended'>('not_started')
  
  const [showReview, setShowReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      const masterRes = await fetch('/api/master/profile', {
        headers: { authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}` },
      })
      if (masterRes.ok) {
        const masterJson = await masterRes.json()
        if (masterJson.master) {
          setIsMaster(true)
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      const bookingRes = await fetch(`/api/chat/${bookingId}/messages`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (bookingRes.ok) {
        const json = await bookingRes.json()
        setMessages(json.messages || [])
      }

      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
      if (bookingData) {
        setBooking(bookingData)
        if (bookingData.status === 'completed') {
          setIsExpired(true)
          setCountdownSeconds(0)
        }
      }

      setIsLoading(false)
    }

    loadData()
  }, [bookingId, router, supabase])

  useEffect(() => {
    if (!booking || booking.status === 'completed') return
    
    const calculateRemaining = () => {
      if (!booking.scheduled_at || !booking.duration_minutes) return 0
      const endTime = new Date(booking.scheduled_at).getTime() + booking.duration_minutes * 60 * 1000
      const now = Date.now()
      return Math.max(0, Math.floor((endTime - now) / 1000))
    }
    
    setCountdownSeconds(calculateRemaining())
    
    const interval = setInterval(() => {
      const remaining = calculateRemaining()
      setCountdownSeconds(remaining)
      
      if (remaining <= 0 && !isExpired) {
        setIsExpired(true)
        clearInterval(interval)
        handleAutoComplete()
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [booking])

  // 咨询状态提示
  useEffect(() => {
    if (!booking) return
    
    const checkStatus = () => {
      if (!booking.scheduled_at || !booking.duration_minutes) return
      const scheduledTime = new Date(booking.scheduled_at).getTime()
      const endTime = scheduledTime + booking.duration_minutes * 60 * 1000
      const now = Date.now()
      
      if (now < scheduledTime) {
        setConsultStatus('not_started')
      } else if (now >= scheduledTime && now < endTime) {
        setConsultStatus('in_progress')
      } else {
        setConsultStatus('ended')
      }
    }
    
    checkStatus()
    const interval = setInterval(checkStatus, 30000) // 每30秒检查一次状态
    
    return () => clearInterval(interval)
  }, [booking])

  const getConsultStatusBanner = () => {
    switch (consultStatus) {
      case 'not_started':
        return {
          text: isZh ? '⏰ 咨询未开始，您可以提前向师傅发送背景信息或问题' : '⏰ Consultation not started yet. You can send background info or questions in advance.',
          bgColor: 'bg-amber-50 border-amber-200 text-amber-800',
        }
      case 'in_progress':
        return {
          text: isZh ? '🔴 咨询进行中' : '🔴 Consultation in progress',
          bgColor: 'bg-green-50 border-green-200 text-green-800',
        }
      case 'ended':
        return {
          text: isZh ? '✅ 咨询已结束' : '✅ Consultation ended',
          bgColor: 'bg-stone-100 border-stone-200 text-stone-600',
        }
    }
  }

  const handleAutoComplete = async () => {
    if (booking?.status === 'completed') return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`/api/chat/${bookingId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
      })
      setBooking(prev => prev ? { ...prev, status: 'completed' } : null)
    } catch (err) {
      console.error('Auto complete error:', err)
    }
  }

  useEffect(() => {
    if (!bookingId) return

    const pollMessages = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`/api/chat/${bookingId}/messages`, {
          headers: { authorization: `Bearer ${session?.access_token || ''}` },
        })

        if (res.ok) {
          const json = await res.json()
          setMessages((prev) => {
            const newMessages = json.messages || []
            if (newMessages.length === prev.length) return prev
            return newMessages
          })
        }
      } catch (err) {
        console.error('Poll messages error:', err)
      }
    }

    pollMessages()
    const interval = setInterval(pollMessages, 2000)

    return () => clearInterval(interval)
  }, [bookingId, supabase])

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || isExpired) return

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || isExpired) return

    setUploadingImage(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`/api/chat/${bookingId}/upload-image`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Upload failed')
      }

      const uploadData = await uploadRes.json()
      const imageUrl = uploadData.image_url

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
        setBooking(prev => prev ? { ...prev, status: 'completed' } : null)
        setIsExpired(true)
        setCountdownSeconds(0)
        if (!isMaster) {
          setShowReview(true)
        } else {
          router.push('/master/dashboard')
        }
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

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      alert(isZh ? '请选择评分' : 'Please select a rating')
      return
    }
    
    setIsSubmittingReview(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${bookingId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          rating: reviewRating,
          content: reviewText,
        }),
      })

      if (res.ok) {
        setShowReview(false)
        router.push('/user/dashboard')
      } else {
        const err = await res.json()
        alert(err.error || 'Submit failed')
      }
    } catch (err) {
      console.error('Review error:', err)
    } finally {
      setIsSubmittingReview(false)
    }
  }

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
  const canComplete = booking?.status === 'in_progress' && !isExpired
  const isCompleted = booking?.status === 'completed' || isExpired

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
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              countdownSeconds <= 300 
                ? 'bg-red-100 text-red-700' 
                : 'bg-stone-100 text-stone-600'
            }`}>
              <Clock className="w-3 h-3" />
              {isCompleted 
                ? (isZh ? '已结束' : 'Ended')
                : formatCountdown(countdownSeconds)
              }
            </div>
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
          {/* 咨询状态提示 */}
          {booking && (
            <div className={`border rounded-lg px-4 py-3 text-sm text-center ${getConsultStatusBanner().bgColor}`}>
              {getConsultStatusBanner().text}
            </div>
          )}
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

      {/* 已结束状态 */}
      {isCompleted && (
        <div className="bg-white border-t border-stone-200 px-4 py-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-stone-500 text-sm mb-2">
              {isZh ? '咨询已结束，您可以查看历史消息' : 'Consultation has ended. You can view the chat history.'}
            </p>
            {!isMaster && !showReview && (
              <Button 
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => setShowReview(true)}
              >
                <Star className="w-4 h-4 mr-1" />
                {isZh ? '评价本次咨询' : 'Rate this consultation'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 输入区域 - 进行中 */}
      {!isCompleted && (
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
      )}

      {/* 评价弹窗 */}
      {showReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-center mb-4">
              {isZh ? '评价本次咨询' : 'Rate this Consultation'}
            </h3>
            <p className="text-stone-500 text-center mb-6">
              {isZh ? `您对 ${master?.nameCn} 师傅的服务满意吗？` : `How was your experience with ${master?.name}?`}
            </p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= reviewRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={isZh ? '写下您的评价（可选）' : 'Write your review (optional)'}
              className="w-full border rounded-lg p-3 text-sm mb-4 resize-none"
              rows={4}
              maxLength={500}
            />
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowReview(false)
                  router.push('/user/dashboard')
                }}
              >
                {isZh ? '跳过' : 'Skip'}
              </Button>
              <Button
                className="flex-1 bg-violet-600 hover:bg-violet-700"
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  isZh ? '提交评价' : 'Submit'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}