'use client'
// cache-bust: 2026-05-27-review-feature-v1

import { useState, useEffect, useRef, useMemo } from 'react'
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
  audio_url: string | null
  audio_duration: number | null
  created_at: string
  read_at?: string | null
  source?: string
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
  review_requested?: boolean
  review_data?: {
    rating: number
    content?: string | null
    created_at: string
  } | null
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

function formatCountdownShort(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
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

  // 语音消息状态
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const recordingDurationRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 对方正在输入状态
  const [isOpponentTyping, setIsOpponentTyping] = useState(false)

  // typing debounce ref
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [consultStatus, setConsultStatus] = useState<'not_started' | 'in_progress' | 'ended'>('not_started')

  // booking ref for auto-complete to avoid stale closure
  const bookingRef = useRef<BookingInfo | null>(null)
  useEffect(() => { bookingRef.current = booking }, [booking])

  const PRE_CONSULT_LIMIT = 5

  // 从 messages 派生咨询前消息计数，避免竞态
  const preConsultMsgCount = useMemo(() => {
    // 如果 booking 状态已经是 confirmed/in_progress，不算 pre-consult
    if (booking?.status === 'confirmed' || booking?.status === 'in_progress') return 0
    if (consultStatus !== 'not_started') return 0
    return messages.filter((m: Message) => m.sender_type === 'user').length
  }, [messages, consultStatus, booking])

  const [showReview, setShowReview] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // 评价弹窗模式：edit=可编辑填写，readonly=只读展示
  const [reviewMode, setReviewMode] = useState<'edit' | 'readonly'>('edit')
  // 师傅端：邀请评价按钮 loading 状态
  const [isRequestingReview, setIsRequestingReview] = useState(false)
  // 当前订单是否已有评价（防止重复弹窗）
  const [hasReview, setHasReview] = useState(false)
  // 师傅是否已发送过邀请
  const [reviewRequested, setReviewRequested] = useState(false)

  // 防连点 / stale closure：用 ref 配合 Realtime 监听
  const showReviewRef = useRef(false)
  const hasReviewRef = useRef(false)
  // 弹窗锁：同一时刻只弹一个评价窗，防止堆叠
  const reviewLockRef = useRef(false)

  useEffect(() => { showReviewRef.current = showReview }, [showReview])
  useEffect(() => { hasReviewRef.current = hasReview }, [hasReview])
  // 弹窗关闭时释放锁
  useEffect(() => {
    if (!showReview) {
      reviewLockRef.current = false
    }
  }, [showReview])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 咨询前消息数已从 messages 派生（preConsultMsgCount useMemo）

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

      // 通过 API 获取 booking + messages（不受 RLS 限制）
      const { data: { session } } = await supabase.auth.getSession()
      const bookingRes = await fetch(`/api/chat/${bookingId}/messages`, {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      })
      if (bookingRes.ok) {
        const json = await bookingRes.json()
        const msgs = json.messages || []
        setMessages(msgs)

        // 从 API 响应获取 booking 数据
        const bookingData = json.booking
        console.log('[chat] API booking:', JSON.stringify(bookingData))
        if (bookingData) {
          setBooking(bookingData)
          // 初始化评价相关状态
          setReviewRequested(!!bookingData.review_requested)
          if (bookingData.review_data) {
            setHasReview(true)
            setReviewRating(bookingData.review_data.rating || 0)
            setReviewText(bookingData.review_data.content || '')
          }
          if (bookingData.status === 'completed') {
            console.log('[chat] init: status=completed → ended')
            setCountdownSeconds(0)
            setConsultStatus('ended')
          } else {
            // 用 scheduled_at 或 scheduled_date+scheduled_time 计算时间
            const scheduledAtStr = bookingData.scheduled_at
              || (bookingData.scheduled_date && bookingData.scheduled_time
                ? `${bookingData.scheduled_date}T${bookingData.scheduled_time}`
                : null)
            if (scheduledAtStr && bookingData.duration_minutes) {
              const scheduledTime = new Date(scheduledAtStr).getTime()
              const endTime = scheduledTime + bookingData.duration_minutes * 60 * 1000
              const now = Date.now()
              const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
              console.log('[chat] init time check:', { scheduledAtStr, scheduledTime, endTime, now, remaining, status: bookingData.status })
              if (now > endTime) {
                console.log('[chat] init: past endTime → ended')
                setCountdownSeconds(0)
                setConsultStatus('ended')
              } else if (now >= scheduledTime) {
                console.log('[chat] init: within time window → in_progress')
                setCountdownSeconds(remaining)
                setConsultStatus('in_progress')
              } else {
                console.log('[chat] init: before start time → not_started')
                setCountdownSeconds(Math.max(0, Math.floor((scheduledTime - now) / 1000)))
              }
            }
          }
        }
      }

      setIsLoading(false)
    }

    loadData()
  }, [bookingId, router, supabase])

  // 倒计时 + 状态同步（每秒更新）
  useEffect(() => {
    if (!booking || booking.status === 'completed') return

    const tick = () => {
      // 用 scheduled_at 或 scheduled_date+scheduled_time 计算时间
      const scheduledAtStr = booking.scheduled_at
        || (booking.scheduled_date && booking.scheduled_time
          ? `${booking.scheduled_date}T${booking.scheduled_time}`
          : null)

      if (!scheduledAtStr || !booking.duration_minutes) {
        console.log('[chat] tick: missing scheduled_at or duration', { scheduledAtStr, duration: booking.duration_minutes })
        setCountdownSeconds(0)
        return
      }

      const scheduledTime = new Date(scheduledAtStr).getTime()
      if (isNaN(scheduledTime)) {
        console.log('[chat] tick: invalid scheduled_at', scheduledAtStr)
        setCountdownSeconds(0)
        return
      }

      const endTime = scheduledTime + booking.duration_minutes * 60 * 1000
      const now = Date.now()

      let remaining: number
      if (now < scheduledTime) {
        remaining = Math.max(0, Math.floor((scheduledTime - now) / 1000))
      } else if (now >= scheduledTime && now < endTime) {
        remaining = Math.max(0, Math.floor((endTime - now) / 1000))
      } else {
        remaining = 0
      }

      setCountdownSeconds(remaining)

      let newStatus: 'not_started' | 'in_progress' | 'ended'

      if (booking.status === 'completed') {
        newStatus = 'ended'
      } else if (booking.status === 'confirmed' || booking.status === 'in_progress') {
        if (now < scheduledTime) {
          newStatus = 'not_started'
        } else if (now >= scheduledTime && now < endTime) {
          newStatus = 'in_progress'
        } else {
          newStatus = 'ended'
        }
      } else {
        // 其他状态（如 paid）
        if (now < scheduledTime) {
          newStatus = 'not_started'
        } else if (now >= scheduledTime && now < endTime) {
          newStatus = 'in_progress'
        } else {
          newStatus = 'ended'
        }
      }

      console.log('[chat] tick:', { now, scheduledTime, endTime, remaining, status: booking.status, newStatus })

      setConsultStatus(prev => {
        if (prev !== newStatus) {
          console.log('[chat] status change:', prev, '→', newStatus)
        }
        return newStatus
      })

      if (remaining <= 0) {
        console.log('[chat] auto-completing: remaining<=0')
        handleAutoComplete()
      }
    }

    tick()
    const interval = setInterval(tick, 1000)

    return () => clearInterval(interval)
  }, [booking])

  const getConsultStatusBanner = () => {
    // 咨询前消息已达上限
    if (consultStatus === 'not_started' && preConsultMsgCount >= PRE_CONSULT_LIMIT && !isMaster) {
      return {
        text: isZh ? `✋ 您的消息次数已用完（${PRE_CONSULT_LIMIT}/${PRE_CONSULT_LIMIT}），等待预约时间正式开始对话` : `✋ Message limit reached (${PRE_CONSULT_LIMIT}/${PRE_CONSULT_LIMIT}). Wait for the scheduled time to start chatting.`,
        bgColor: 'bg-orange-50 border-orange-200 text-orange-800',
      }
    }
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
          bgColor: 'bg-stone-200 border-stone-300 text-stone-700',
        }
    }
  }

  const handleAutoComplete = async () => {
    const currentBooking = bookingRef.current
    if (!currentBooking || currentBooking.status === 'completed') return
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
          const newMessages = json.messages || []
          const newBooking = json.booking
          const typing = json.typing || { user: false, master: false }

          // 更新 booking 数据（服务端状态可能已变更）
          if (newBooking && newBooking.id) {
            setBooking(prev => {
              if (prev && prev.status === newBooking.status) return prev
              return newBooking
            })
          }

          setMessages((prev) => {
            if (newMessages.length === prev.length) return prev
            return newMessages
          })

          // 更新对方 typing 状态
          const opponentTyping = isMaster ? typing.user : typing.master
          setIsOpponentTyping(!!opponentTyping)
        }
      } catch (err) {
        console.error('Poll messages error:', err)
      }
    }

    pollMessages()
    const interval = setInterval(pollMessages, 2000)

    return () => clearInterval(interval)
  }, [bookingId, supabase, consultStatus])

  // Supabase Realtime 监听：用户端按 bookingId 精确监听 bookings 表
  // 检测到 review_requested=true 时自动弹出评价弹窗
  useEffect(() => {
    if (!bookingId || isMaster) return

    const channel = supabase
      .channel(`booking-review-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload: any) => {
          const newRecord = payload.new
          console.log('[chat] realtime update:', newRecord)
          // 更新本地 booking 状态
          setBooking(prev => prev ? { ...prev, ...newRecord } : null)
          // 检测到师傅邀请评价
          if (newRecord.review_requested) {
            setReviewRequested(true)
            // 如果已有评价数据，切换到只读模式
            if (newRecord.review_data) {
              setHasReview(true)
              setReviewRating(newRecord.review_data.rating || 0)
              setReviewText(newRecord.review_data.content || '')
              setReviewMode('readonly')
            }
            // 防堆叠：只有未弹窗、未评价时才弹出
            if (!showReviewRef.current && !hasReviewRef.current && !reviewLockRef.current) {
              reviewLockRef.current = true
              setShowReview(true)
              setReviewMode(newRecord.review_data ? 'readonly' : 'edit')
            }
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [bookingId, supabase, isMaster])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    // 发送 typing 状态（debounce 500ms）
    if (value.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // 立即发送 typing 开始
      sendTypingStatus(true)

      // 停止输入 1.5 秒后发送 typing 结束
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false)
      }, 1500)
    }
  }

  const sendTypingStatus = async (isTyping: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`/api/chat/${bookingId}/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ isTyping }),
      })
    } catch (err) {
      // typing 状态发送失败静默处理，不影响主流程
      console.error('Typing status error:', err)
    }
  }

  // 处理粘贴图片
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageItem = Array.from(items).find(
      (item) => item.type.startsWith('image/')
    )

    if (!imageItem) return

    const file = imageItem.getAsFile()
    if (!file) return

    // 阻止默认粘贴行为（防止文件名粘贴到输入框）
    e.preventDefault()

    // 走现有图片上传流程
    await uploadImageFile(file)
  }

  const uploadImageFile = async (file: File) => {
    // 用户端：过期后不能发图；师傅端：随时可以发
    if (consultStatus === 'ended' && !isMaster) return

    // 前端：咨询未开始时检查5条限制
    if (consultStatus === 'not_started' && !isMaster && preConsultMsgCount >= PRE_CONSULT_LIMIT) {
      alert(isZh
        ? `已达到咨询前消息上限（${PRE_CONSULT_LIMIT}条），请等待预约时间正式开始对话`
        : `Pre-consultation message limit reached (${PRE_CONSULT_LIMIT}). Please wait for the scheduled time.`
      )
      return
    }

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
    }
  }

  // ===== 语音消息功能 =====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        uploadAudio(audioBlob, recordingDurationRef.current)
        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingDuration(0)
      recordingDurationRef.current = 0

      // 计时器
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
        recordingDurationRef.current += 1
      }, 1000)
    } catch (err) {
      console.error('Recording error:', err)
      alert(isZh ? '无法访问麦克风，请检查权限设置' : 'Cannot access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const uploadAudio = async (blob: Blob, duration: number) => {
    if (consultStatus === 'ended' && !isMaster) return
    if (consultStatus === 'not_started' && !isMaster && preConsultMsgCount >= PRE_CONSULT_LIMIT) {
      alert(isZh
        ? `已达到咨询前消息上限（${PRE_CONSULT_LIMIT}条），请等待预约时间正式开始对话`
        : `Pre-consultation message limit reached (${PRE_CONSULT_LIMIT}). Please wait for the scheduled time.`
      )
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', blob, `recording_${Date.now()}.webm`)
      formData.append('duration', duration.toString())

      const uploadRes = await fetch(`/api/chat/${bookingId}/upload-audio`, {
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

      const res = await fetch(`/api/chat/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          audio_url: uploadData.audio_url,
          audio_duration: uploadData.duration,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Audio send failed')
      }
    } catch (err: any) {
      console.error('Audio upload error:', err)
      alert(`Upload failed: ${err.message}`)
    }
  }

  const playAudio = (msgId: string, audioUrl: string) => {
    if (audioPlayingId === msgId) {
      // 暂停
      audioRef.current?.pause()
      setAudioPlayingId(null)
    } else {
      // 播放
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => setAudioPlayingId(null)
      audio.play()
      setAudioPlayingId(msgId)
    }
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const [previewImage, setPreviewImage] = useState<string | null>(null)
  // Force rebuild: chat countdown fix v4

  const handleSend = async () => {
    const content = inputValue.trim()
    if (!content || isSending || consultStatus === 'ended') return

    // 前端：咨询未开始时检查5条限制
    if (consultStatus === 'not_started' && !isMaster && preConsultMsgCount >= PRE_CONSULT_LIMIT) {
      alert(isZh
        ? `已达到咨询前消息上限（${PRE_CONSULT_LIMIT}条），请等待预约时间正式开始对话`
        : `Pre-consultation message limit reached (${PRE_CONSULT_LIMIT}). Please wait for the scheduled time.`
      )
      return
    }

    // 乐观更新：立即显示消息
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId,
      booking_id: bookingId,
      sender_id: user?.id || '',
      sender_type: isMaster ? 'master' : 'user',
      sender_name: isMaster ? 'Master' : (user?.user_metadata?.full_name || user?.email || 'User'),
      content,
      image_url: null,
      audio_url: null,
      audio_duration: null,
      created_at: new Date().toISOString(),
      read_at: null,
      source: 'chat',
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setInputValue('')
    inputRef.current?.focus()
    setIsSending(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/chat/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ content }),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.message) {
          // 用服务端返回的真实消息替换临时消息
          setMessages((prev) => {
            if (prev.some((m) => m.id === json.message.id)) return prev
            return prev.map((m) => m.id === tempId ? json.message : m)
          })
        } else {
          // 后端返回200但message为null，移除临时消息并提示
          console.error('[chat] API returned 200 but no message:', json)
          setMessages((prev) => prev.filter((m) => m.id !== tempId))
          alert(isZh ? '发送失败，请重试' : 'Send failed, please retry')
        }
      } else {
        const err = await res.json()
        // 发送失败，移除乐观更新的消息
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
        alert(err.error || 'Send failed')
      }
    } catch (err) {
      console.error('Send error:', err)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      alert(isZh ? '发送失败，请重试' : 'Send failed, please retry')
    } finally {
      setIsSending(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || consultStatus === 'ended') return

    // 前端：咨询未开始时检查5条限制（图片也算一条消息）
    if (consultStatus === 'not_started' && !isMaster && preConsultMsgCount >= PRE_CONSULT_LIMIT) {
      alert(isZh
        ? `已达到咨询前消息上限（${PRE_CONSULT_LIMIT}条），请等待预约时间正式开始对话`
        : `Pre-consultation message limit reached (${PRE_CONSULT_LIMIT}). Please wait for the scheduled time.`
      )
      return
    }

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
      // preConsultMsgCount 已从 messages 派生，无需乐观更新
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

  const handleRequestReview = async () => {
    if (!isMaster || !booking) return
    setIsRequestingReview(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/bookings/${bookingId}/request-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
      })
      const json = await res.json()
      if (res.ok) {
        setReviewRequested(true)
        // 如果已有评价，提示师傅
        if (json.hasReview) {
          alert(isZh ? '该订单已有评价，用户将看到只读评价详情' : 'This order already has a review. The user will see a read-only view.')
        } else {
          alert(isZh ? '已邀请用户评价' : 'Review request sent')
        }
      } else {
        alert(json.error || (isZh ? '邀请失败' : 'Request failed'))
      }
    } catch (err: any) {
      console.error('Request review error:', err)
      alert(isZh ? '邀请失败，请重试' : 'Request failed, please retry')
    } finally {
      setIsRequestingReview(false)
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
        setCountdownSeconds(0)
        // 旧逻辑已删除：用户点击结束不再自动弹出评价窗口
        // 评价改由师傅触发（邀请评价按钮 + Realtime 监听）
        if (isMaster) {
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
        setHasReview(true)
        reviewLockRef.current = false
        // 更新本地 booking 的 review_data，避免再次弹窗
        setBooking(prev => prev ? { ...prev, review_data: { rating: reviewRating, content: reviewText, created_at: new Date().toISOString() } } : null)
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
  const canComplete = booking?.status === 'in_progress' && consultStatus !== 'ended'
  const isCompleted = booking?.status === 'completed' || consultStatus === 'ended'
  // 师傅可邀请评价：订单已完成/已结束，且是师傅身份
  const canRequestReview = isMaster && isCompleted

  console.log('[chat] render:', { status: booking?.status, consultStatus, isCompleted, countdownSeconds })

  return (
    <div className="min-h-[100dvh] h-[100dvh] bg-gradient-to-br from-stone-50 to-stone-100 flex flex-col overflow-hidden">
      {/* 顶部栏 — 固定定位，滚动时始终可见 */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href={isMaster ? '/master/dashboard' : '/user/dashboard'}
            className="flex items-center text-stone-600 hover:text-stone-900 shrink-0"
          >
            <ArrowLeft className="w-5 h-5 mr-1 sm:mr-2" />
            <span className="font-medium hidden sm:inline">{isZh ? '返回' : 'Back'}</span>
          </Link>
          <div className="text-center flex-1 min-w-0 px-2">
            <h1 className="text-sm sm:text-lg font-bold text-stone-900 truncate">
              {isZh ? service?.nameCn : service?.name}
            </h1>
            <p className="text-xs text-stone-500 hidden sm:block truncate">
              {isZh ? master?.nameCn : master?.name} · {booking?.scheduled_date} {booking?.scheduled_time}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs font-medium ${
              countdownSeconds <= 300 && consultStatus === 'in_progress'
                ? 'bg-red-100 text-red-700'
                : 'bg-stone-100 text-stone-600'
            }`}>
              <Clock className="w-3 h-3" />
              <span className="hidden sm:inline">
                {isCompleted
                  ? (isZh ? '已结束' : 'Ended')
                  : consultStatus === 'not_started'
                    ? (isZh ? '未开始' : 'Upcoming')
                    : formatCountdown(countdownSeconds)
                }
              </span>
              <span className="sm:hidden">
                {isCompleted
                  ? (isZh ? '结束' : 'End')
                  : consultStatus === 'not_started'
                    ? (isZh ? '待' : 'Wait')
                    : formatCountdownShort(countdownSeconds)
                }
              </span>
            </div>
            {canComplete && (
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50 px-2 sm:px-3"
                onClick={handleComplete}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-0 sm:mr-1" />
                    <span className="hidden sm:inline">{isZh ? '结束' : 'Complete'}</span>
                  </>
                )}
              </Button>
            )}
            {/* 师傅端：邀请评价按钮 */}
            {canRequestReview && (
              <Button
                size="sm"
                variant="outline"
                className={`px-2 sm:px-3 ${reviewRequested || hasReview ? 'text-stone-400 border-stone-200 bg-stone-50 cursor-not-allowed' : 'text-amber-600 border-amber-200 hover:bg-amber-50'}`}
                onClick={handleRequestReview}
                disabled={isRequestingReview || reviewRequested || hasReview}
              >
                {isRequestingReview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-0 sm:mr-1" />
                    <span className="hidden sm:inline">
                      {hasReview ? (isZh ? '已评价' : 'Reviewed') : reviewRequested ? (isZh ? '已邀请' : 'Invited') : (isZh ? '邀请评价' : 'Request Review')}
                    </span>
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
          {/* 咨询状态提示 — sticky 固定在消息区顶部 */}
          {booking && (
            <div className={`sticky top-0 z-10 border rounded-lg px-3 py-2 text-xs sm:text-sm text-center shadow-sm break-words leading-relaxed ${getConsultStatusBanner().bgColor}`}>
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
                  className={`max-w-[85%] sm:max-w-[75%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
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
                      loading="lazy"
                      onClick={() => setPreviewImage(msg.image_url!)}
                    />
                  )}
                  {msg.audio_url && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-violet-500/20 hover:bg-violet-500/30"
                        onClick={() => playAudio(msg.id, msg.audio_url!)}
                      >
                        {audioPlayingId === msg.id ? (
                          <span className="w-3 h-3 bg-violet-200 rounded-sm" />
                        ) : (
                          <svg className="w-4 h-4 text-violet-200" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </Button>
                      <span className="text-xs text-violet-200">
                        {formatDuration(msg.audio_duration || 0)}
                      </span>
                      <div className="flex items-end gap-0.5 h-4">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-violet-300/50 rounded-full"
                            style={{
                              height: `${Math.random() * 100}%`,
                              animationDelay: `${i * 50}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* 已读状态 - 仅自己消息显示 */}
                  {isMe && (
                    <div className="flex justify-end mt-1">
                      <span className="text-[10px] text-violet-200">
                        {msg.read_at ? '✓✓' : '✓'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {/* 对方正在输入指示器 */}
          {isOpponentTyping && consultStatus === 'in_progress' && (
            <div className="flex justify-start">
              <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">
                    {isMaster ? (isZh ? '用户正在输入...' : 'User is typing...') : (isZh ? '师傅正在输入...' : 'Master is typing...')}
                  </span>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t border-stone-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {/* 已结束 - 只读提示 */}
          {isCompleted && (
            <div className="flex items-center justify-center gap-2 py-2">
              <p className="text-stone-400 text-sm">
                {isZh ? '✅ 咨询已结束，真心希望能帮助到您' : '✅ Consultation ended. We hope it was helpful.'}
              </p>
            </div>
          )}

          {/* 咨询前消息次数已达上限 */}
          {consultStatus === 'not_started' && preConsultMsgCount >= PRE_CONSULT_LIMIT && !isMaster && !isCompleted && (
            <div className="flex items-center justify-center py-2">
              <p className="text-orange-500 text-sm">
                {isZh ? `✋ 您的消息次数已用完（${preConsultMsgCount}/${PRE_CONSULT_LIMIT}），等待预约时间正式开始对话` : `✋ Message limit reached (${preConsultMsgCount}/${PRE_CONSULT_LIMIT}). Wait for the scheduled time.`}
              </p>
            </div>
          )}

          {/* 正常输入区域 */}
          {(!isCompleted && !(consultStatus === 'not_started' && preConsultMsgCount >= PRE_CONSULT_LIMIT && !isMaster)) && (
            <div className="flex items-end gap-2">
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
              {/* 录音按钮 */}
              <Button
                variant={isRecording ? 'default' : 'outline'}
                size="icon"
                className={`shrink-0 ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={uploadingImage}
              >
                {isRecording ? (
                  <span className="text-xs font-bold">{formatDuration(recordingDuration)}</span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </Button>
              <div className="flex-1 relative" onPaste={handlePaste}>
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={isZh ? '输入消息...' : 'Type a message...'}
                  className="pr-10 text-base sm:text-sm"
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
          )}
        </div>
      </div>

      {/* 评价弹窗 */}
      {showReview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-center mb-4">
              {reviewMode === 'readonly'
                ? (isZh ? '评价详情' : 'Review Details')
                : (isZh ? '评价本次咨询' : 'Rate this Consultation')}
            </h3>
            <p className="text-stone-500 text-center mb-6">
              {isZh ? `您对 ${master?.nameCn} 师傅的服务满意吗？` : `How was your experience with ${master?.name}?`}
            </p>

            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => reviewMode === 'edit' && setReviewRating(star)}
                  className="focus:outline-none p-1 sm:p-0"
                  disabled={reviewMode === 'readonly'}
                >
                  <Star
                    className={`w-11 h-11 sm:w-8 sm:h-8 ${
                      star <= reviewRating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-stone-300'
                    } ${reviewMode === 'readonly' ? 'cursor-default' : 'cursor-pointer'}`}
                  />
                </button>
              ))}
            </div>

            {reviewMode === 'edit' ? (
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={isZh ? '写下您的评价（可选）' : 'Write your review (optional)'}
                className="w-full border rounded-lg p-3 text-base sm:text-sm mb-4 resize-none"
                rows={4}
                maxLength={500}
              />
            ) : (
              <div className="w-full border rounded-lg p-3 text-base sm:text-sm mb-4 bg-stone-50 text-stone-700 min-h-[80px]">
                {reviewText || (isZh ? '（无文字评价）' : '(No written review)')}
              </div>
            )}

            <div className="flex gap-3">
              {reviewMode === 'edit' ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowReview(false)
                      reviewLockRef.current = false
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
                </>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowReview(false)
                    reviewLockRef.current = false
                  }}
                >
                  {isZh ? '关闭' : 'Close'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 图片预览弹窗 */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[85vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            onClick={() => setPreviewImage(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
