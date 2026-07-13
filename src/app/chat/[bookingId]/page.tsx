'use client'
// cache-bust: 2026-06-03-voice-debug

import Image from 'next/image'
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
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { isMasterEmail } from '@/lib/master-auth'
import { TimeEngine } from '@/lib/timeEngine'
import { generateRequestId, logChatEvent, ChatEventTypes } from '@/lib/chat-observability'
import {
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  updateOfflineQueue,
  isNetworkOnline,
  onNetworkChange,
  type OfflineMessage,
} from '@/lib/chatOfflineQueue'

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
  voice_status?: 'uploading' | 'uploaded' | 'sending' | 'sent' | 'failed'
  audio_size?: number | null
  audio_format?: string | null
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
  scheduled_date: string  // Supabase camelCase transform: actually scheduledDate
  scheduled_time: string  // Supabase camelCase transform: actually scheduledTime
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

function normalizeBooking(bookingData: any): BookingInfo {
  // Supabase 可能返回 camelCase 或 snake_case，全部尝试
  let scheduledDate = bookingData.scheduledDate || bookingData.scheduled_date || ''
  let scheduledTime = bookingData.scheduledTime || bookingData.scheduled_time || ''
  const scheduledAt = bookingData.scheduledAt || bookingData.scheduled_at || ''

  // 兜底：从 scheduled_at 解析，明确使用东八区 Intl API（不受浏览器本地时区影响）
  if ((!scheduledDate || !scheduledTime) && scheduledAt) {
    try {
      const d = new Date(scheduledAt)
      if (!isNaN(d.getTime())) {
        const fmtDate = new Intl.DateTimeFormat('zh-CN', {
          timeZone: 'Asia/Shanghai',
          year: 'numeric', month: '2-digit', day: '2-digit'
        })
        const fmtTime = new Intl.DateTimeFormat('zh-CN', {
          timeZone: 'Asia/Shanghai',
          hour: '2-digit', minute: '2-digit', hour12: false
        })
        const dateParts = fmtDate.formatToParts(d)
        const timeParts = fmtTime.formatToParts(d)
        const getPart = (parts: Intl.DateTimeFormatPart[], type: string) =>
          parts.find((p) => p.type === type)?.value || ''

        if (!scheduledDate) {
          scheduledDate = `${getPart(dateParts, 'year')}-${getPart(dateParts, 'month')}-${getPart(dateParts, 'day')}`
        }
        if (!scheduledTime) {
          scheduledTime = `${getPart(timeParts, 'hour')}:${getPart(timeParts, 'minute')}`
        }
      }
    } catch (e) {
      console.error('[chat] normalizeBooking failed to parse scheduled_at:', scheduledAt, e)
    }
  }

  return {
    ...bookingData,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    scheduled_at: scheduledAt,
    review_requested: bookingData.review_requested || false,
    review_data: bookingData.review_data || undefined,
  }
}

// 图片压缩：最长边限制，JPEG quality 80%
function compressImage(
  file: File,
  maxDimension: number = 1920,
  quality: number = 0.8
): Promise<File | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(null)
      return
    }

    const img = new window.Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      
      let { width, height } = img
      
      // 计算缩放比例
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }
      
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        resolve(null)
        return
      }
      
      // 白色背景（处理透明PNG）
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null)
            return
          }
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        },
        'image/jpeg',
        quality
      )
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    
    img.src = url
  })
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
  const [accessError, setAccessError] = useState<{status: number; message: string} | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState(0)

  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [retryAudio, setRetryAudio] = useState<{ blob: Blob, duration: number } | null>(null)

  // Voice Engine v1.0: State machine for voice messages
  interface VoiceState {
    status: 'idle' | 'recording' | 'uploading' | 'sending' | 'sent' | 'failed'
    progress?: number
    error?: string
  }
  const [voiceState, setVoiceState] = useState<VoiceState>({ status: 'idle' })

  // 语音消息状态
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const recordingDurationRef = useRef(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectURLsRef = useRef<string[]>([])
  // 15MB max for 180s audio
  const MAX_AUDIO_SIZE = 15 * 1024 * 1024
  // 3分钟限制：Vercel Hobby 函数超时10秒，但音频文件15MB足够录8-12分钟
  // 实际限制是文件大小而非时长，180秒是合理上限
  const MAX_RECORDING_SECONDS = 180

  // 检测浏览器类型和推荐格式
  const getAudioFormat = (): { mimeType: string, ext: string } => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    if (isIOS) {
      // iOS Safari: try audio/mp4 first, fallback to default (browser will pick)
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        return { mimeType: 'audio/mp4', ext: 'm4a' }
      }
      if (MediaRecorder.isTypeSupported('audio/aac')) {
        return { mimeType: 'audio/aac', ext: 'm4a' }
      }
      // iOS may not support any audio-only MIME type; let browser decide
      return { mimeType: '', ext: 'm4a' }
    }
    if (isSafari) {
      // macOS Safari
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        return { mimeType: 'audio/mp4', ext: 'm4a' }
      }
      if (MediaRecorder.isTypeSupported('audio/aac')) {
        return { mimeType: 'audio/aac', ext: 'm4a' }
      }
    }
    // Chrome/Android: webm
    return { mimeType: 'audio/webm', ext: 'webm' }
  }

  // 资源清理：释放所有 ObjectURL
  const releaseObjectURLs = () => {
    objectURLsRef.current.forEach(url => {
      try { URL.revokeObjectURL(url) } catch (e) { /* ignore */ }
    })
    objectURLsRef.current = []
  }

  // 对方正在输入状态
  const [isOpponentTyping, setIsOpponentTyping] = useState(false)

  // typing debounce ref
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const [consultStatus, setConsultStatus] = useState<'not_started' | 'in_progress' | 'ended' | 'completed'>('not_started')

  // booking ref for auto-complete to avoid stale closure
  const bookingRef = useRef<BookingInfo | null>(null)
  useEffect(() => { bookingRef.current = booking }, [booking])

  // 倒计时状态机：只使用 scheduled_at（数据库 timestamp with timezone）
  // 根治：统一用东八区时间比较，避免 UTC  vs 本地时间的 8 小时偏差
  const getScheduledTime = (bookingData: BookingInfo): number | null => {
    if (!bookingData.scheduled_at) return null
    // 根治：解析时明确指定 +08:00，不要用 new Date() 自动转本地时区
    const d = new Date(bookingData.scheduled_at)
    if (isNaN(d.getTime())) {
      console.error('[chat] Invalid scheduled_at:', bookingData.scheduled_at)
      return null
    }
    // 返回 UTC timestamp，但后续比较时也用 UTC timestamp
    return d.getTime()
  }

  const PRE_CONSULT_LIMIT = 5

  // 从 messages 派生咨询前消息计数，避免竞态
  const preConsultMsgCount = useMemo(() => {
    // 如果 booking 状态已经是 confirmed/in_progress，不算 pre-consult
    if (booking?.status === 'confirmed' || booking?.status === 'in_progress') return 0
    if (consultStatus !== 'not_started') return 0
    return messages.filter((m: Message) => m.sender_type === 'user').length
  }, [messages, consultStatus, booking])

  const [showReview, setShowReview] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
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

  // 初始化时滚动到底部，帮助浏览器建立正确的滚动位置（iOS 键盘预热）
  useEffect(() => {
    const warmup = setTimeout(() => {
      scrollToBottom()
    }, 300)
    return () => clearTimeout(warmup)
  }, [])

  // 只在消息数量增加时（新消息到达）自动滚动到底部
  const prevMsgCountRef = useRef(0)
  useEffect(() => {
    const prevCount = prevMsgCountRef.current
    const currentCount = messages.length
    prevMsgCountRef.current = currentCount
    
    // 新消息到达时滚动（消息数量增加且不是初始化）
    if (currentCount > 0 && currentCount > prevCount) {
      scrollToBottom()
    }
  }, [messages])

  // 移动端语音录制：按住状态
  const [isPressing, setIsPressing] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const touchStartYRef = useRef<number>(0)
  const touchStartXRef = useRef<number>(0)

  // 音频预加载：当 messages 中有新音频时，提前加载
  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.audio_url && !msg.audio_url.startsWith('blob:')) {
        const audio = new Audio(msg.audio_url);
        audio.preload = 'auto';
        audio.load();
      }
    });
  }, [messages]);

  // 咨询前消息数已从 messages 派生（preConsultMsgCount useMemo）

  useEffect(() => {
    const loadData = async () => {
      // Step 1: 获取当前用户
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)

      // Step 2: 获取 session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session?.access_token) {
        router.push('/auth/login?redirect=' + encodeURIComponent(`/chat/${bookingId}`))
        return
      }

      // Step 3: 判断是否是师傅身份（只有师傅邮箱才请求，避免普通用户403）
      const isMasterUser = isMasterEmail(user.email || '')
      if (isMasterUser) {
        const masterRes = await fetch('/api/master/profile', {
          headers: { authorization: `Bearer ${session.access_token}` },
          credentials: 'include',
        })
        if (masterRes.ok) {
          const masterJson = await masterRes.json()
          if (masterJson.master) {
            setIsMaster(true)
          }
        }
      }

      // Step 4: 获取 booking + messages（核心数据）
      const bookingRes = await fetch(`/api/chat/${bookingId}/messages`, {
        headers: { authorization: `Bearer ${session.access_token}` },
        credentials: 'include',
      })
      
      if (bookingRes.ok) {
        const json = await bookingRes.json()
        
        const msgs = json.messages || []
        setMessages(msgs)

        const bookingData = json.booking
        if (bookingData) {
          const normalized = normalizeBooking(bookingData)
          setBooking(normalized)
          
          // 初始化倒计时状态
          if (bookingData.status === 'completed') {
            setCountdownSeconds(0)
            setConsultStatus('completed')
          } else {
            const scheduledTime = bookingData.scheduled_at ? new Date(bookingData.scheduled_at).getTime() : null
            if (scheduledTime && !isNaN(scheduledTime) && bookingData.duration_minutes) {
              const endTime = scheduledTime + bookingData.duration_minutes * 60 * 1000
              const now = Date.now()
              const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
              if (now > endTime) {
                setCountdownSeconds(0)
                setConsultStatus('ended')
              } else if (now >= scheduledTime) {
                setCountdownSeconds(remaining)
                setConsultStatus('in_progress')
              } else {
                setCountdownSeconds(Math.max(0, Math.floor((scheduledTime - now) / 1000)))
                setConsultStatus('not_started')
              }
            }
          }
        } else {
          console.error('[chat] bookingData is null')
        }
      } else {
        const errorText = await bookingRes.text()
        console.error('[chat] API error', bookingRes.status, errorText)
        // 设置访问错误状态，阻止页面渲染空框架
        setAccessError({
          status: bookingRes.status,
          message: bookingRes.status === 403
            ? (isZh ? '您没有权限查看此订单' : 'You do not have permission to view this order')
            : bookingRes.status === 404
              ? (isZh ? '订单不存在' : 'Order not found')
              : (isZh ? '加载失败，请稍后重试' : 'Failed to load, please try again later'),
        })
      }

      setIsLoading(false)
    }

    loadData()
  }, [bookingId, router, supabase])

  // 轮询刷新 booking 数据（每 30 秒），reschedule 后实时感知新时间
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (!session?.access_token) {
          return
        }
        const res = await fetch(`/api/chat/${bookingId}/messages`, {
          headers: { authorization: `Bearer ${session.access_token}` },
          credentials: 'include',
        })
        if (res.ok) {
          const json = await res.json()
          if (json.booking) {
            setBooking(prev => {
              if (!prev) return normalizeBooking(json.booking)
              // 只在 scheduled_at 或 status 变化时才更新，避免不必要的重渲染
              if (prev.scheduled_at !== json.booking.scheduled_at || prev.status !== json.booking.status) {
                return normalizeBooking(json.booking)
              }
              return prev
            })
          }
        }
      } catch (err) {
        console.error('[chat] polling refresh error:', err)
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [bookingId, supabase])

  // 倒计时 + 状态同步（每秒更新）
  useEffect(() => {
    if (!booking) return
    if (booking.status === 'completed') {
      setCountdownSeconds(0)
      setConsultStatus('completed')
      return
    }
    // 已取消/已退款的订单停止倒计时，避免自动完成
    if (booking.status === 'cancelled' || booking.status === 'refunded' || booking.payment_status === 'cancelled') {
      setCountdownSeconds(0)
      setConsultStatus('ended')
      return
    }

    const tick = () => {
      // 正规做法：倒计时只用 scheduled_at
      const scheduledTime = booking.scheduled_at ? new Date(booking.scheduled_at).getTime() : null

      if (!scheduledTime || isNaN(scheduledTime) || !booking.duration_minutes) {
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

      // 使用 TimeEngine 统一计算状态
      const engineState = TimeEngine.getSessionState({
        scheduled_at: booking.scheduled_at,
        duration_minutes: booking.duration_minutes,
        status: booking.status,
      })

      // 将 TimeEngine 状态映射到 chat 内部状态
      const statusMap: Record<string, 'not_started' | 'in_progress' | 'ended' | 'completed'> = {
        'confirmed': 'not_started',
        'upcoming': 'not_started',
        'in_progress': 'in_progress',
        'ended': 'ended',
        'completed': 'completed',
        'scheduled': 'not_started',
      }
      const newStatus = statusMap[engineState] || 'not_started'

      setConsultStatus(prev => {
        return newStatus
      })

      if (remaining <= 0) {
        console.log('[chat:debug] auto-complete triggered!', { remaining, scheduledTime, endTime, now, duration: booking.duration_minutes, status: booking.status })
        handleAutoComplete()
      }
    }

    tick()
    const interval = setInterval(tick, 1000)

    return () => clearInterval(interval)
  }, [booking])

  // 格式化显示时间：用 TimeEngine 统一处理
  const formatDisplayTime = (isoString: string): string => {
    if (!isoString) return ''
    try {
      return TimeEngine.formatInTimezone(isoString, 'Asia/Shanghai', 'zh-CN')
    } catch (e) {
      return ''
    }
  }

  // 根治：格式化日期+时间，统一用 TimeEngine
  const formatDisplayDateTime = (isoString: string): string => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return ''
      const dateStr = d.toLocaleDateString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: 'long',
        day: 'numeric'
      })
      const timeStr = TimeEngine.formatInTimezone(isoString, 'Asia/Shanghai', 'zh-CN')
      return `${dateStr} ${timeStr.split(' ')[1]}`
    } catch (e) {
      return ''
    }
  }

  const getConsultStatusBanner = () => {
    // 咨询前消息已达上限
    if (consultStatus === 'not_started' && preConsultMsgCount >= PRE_CONSULT_LIMIT && !isMaster) {
      return {
        text: isZh ? `✋ 您的消息次数已用完（${PRE_CONSULT_LIMIT}/${PRE_CONSULT_LIMIT}），等待预约时间正式开始对话` : `✋ Message limit reached (${PRE_CONSULT_LIMIT}/${PRE_CONSULT_LIMIT}). Wait for the scheduled time to start chatting.`,
        bgColor: 'bg-orange-50 border-orange-200 text-orange-800',
      }
    }
    switch (consultStatus) {
      case 'not_started': {
        // 优先用 scheduled_time，没有则从 scheduled_at 解析（双保险）
        let displayTime = booking?.scheduled_time
          ? booking.scheduled_time.split(':').slice(0, 2).join(':')
          : ''
        if (!displayTime && booking?.scheduled_at) {
          displayTime = formatDisplayTime(booking.scheduled_at)
        }
        // 根治兜底：时间字段全空时显示明确提示，避免空白
        if (!displayTime) {
          displayTime = isZh ? '时间未设置' : 'Time not set'
        }
        const hint = isMaster
          ? (isZh ? '请向顾客询问需要了解的问题' : 'Please ask the customer for details.')
          : (isZh ? '请先向师傅描述您的问题' : 'Please describe your question.')
        return {
          text: isZh
            ? `⏰ 咨询将于 ${displayTime} 开始 · ${hint}`
            : `⏰ Starts at ${displayTime} · ${hint}`,
          bgColor: 'bg-amber-50 border-amber-100 text-amber-900',
        }
      }
      case 'in_progress':
        return {
          text: isZh ? '🔴 咨询进行中' : '🔴 Consultation in progress',
          bgColor: 'bg-green-50 border-green-200 text-green-800',
        }
      case 'ended': {
        // 严格区分 ended vs completed：ended 是倒计时结束但尚未 completed
        // 用户端和师傅端显示不同
        if (isMaster) {
          return {
            text: isZh 
              ? '⏳ 咨询已结束，收尾阶段。您可以继续发送收尾消息。' 
              : '⏳ Consultation ended. Wrap-up period active. You may continue sending follow-up messages.',
            bgColor: 'bg-blue-50 border-blue-200 text-blue-800',
          }
        }
        return {
          text: isZh 
            ? '✅ 咨询已结束。师傅可能还在发送收尾消息。' 
            : '✅ Consultation ended. Your advisor may still send follow-up messages.',
          bgColor: 'bg-stone-200 border-stone-300 text-stone-700',
        }
      }
      case 'completed':
        return {
          text: isZh ? '✅ 咨询已完全结束' : '✅ Consultation fully completed.',
          bgColor: 'bg-green-50 border-green-200 text-green-800',
        }
      default:
        return {
          text: isZh ? `⏰ 咨询将于 ${booking?.scheduled_date || ''} ${booking?.scheduled_time?.split(':').slice(0, 2).join(':') || ''} 开始` : `⏰ Consultation upcoming`,
          bgColor: 'bg-amber-200 border-amber-400 text-amber-900 font-bold',
        }
    }
  }

  const handleAutoComplete = async () => {
    const currentBooking = bookingRef.current
    console.log('[chat:debug] handleAutoComplete called', { status: currentBooking?.status, id: bookingId })
    if (!currentBooking || currentBooking.status === 'completed') return
    
    // 前端不再自动调用 API 标记完成
    // completed 只能由后端（cron 或用户手动点击）标记
    // 前端 countdown tick 已经正确设置了 consultStatus，不需要再覆盖
    console.log('[chat:state] auto-complete: countdown ended, UI already handled by tick')
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
          const serverMessages = json.messages || []
          const newBooking = json.booking
          const typing = json.typing || { user: false, master: false }

          // 更新 booking 数据（服务端状态可能已变更）
          if (newBooking && newBooking.id) {
            setBooking(prev => {
              if (prev && prev.status === newBooking.status) return prev
              return normalizeBooking(newBooking)
            })
          }

          // ⚠️ 关键修复：消息合并逻辑
          // 服务端消息 + 本地乐观更新的临时消息（尚未收到服务端确认）
          setMessages((prev) => {
            // 识别本地临时消息（以 'temp-' 开头）
            const tempMessages = prev.filter(m => m.id.startsWith('temp-'))
            
            // 根治兜底：服务端消息为空但本地有真实消息时，保留本地消息
            // 这防止 API 查询异常或数据延迟导致消息"消失"
            const realMessages = prev.filter(m => !m.id.startsWith('temp-'))
            if (serverMessages.length === 0 && realMessages.length > 0) {
              return [...realMessages, ...tempMessages]
            }
            
            // 如果本地没有临时消息且服务端有数据，直接替换为服务端消息
            if (tempMessages.length === 0 && serverMessages.length > 0) {
              return serverMessages
            }
            
            // 服务端消息中存在与临时消息相同内容+发送者+时间的，视为已确认
            // 保留尚未确认的临时消息，避免消息"消失"
            const serverMsgMap = new Map<string, Message>()
            serverMessages.forEach((m: Message) => {
              // 用 content + sender_type + 时间戳(精确到秒) 作为匹配键
              const key = `${m.content || ''}|${m.sender_type}|${m.created_at?.slice(0, 19)}`
              serverMsgMap.set(key, m)
            })
            
            const stillPending = tempMessages.filter((temp: Message) => {
              const key = `${temp.content || ''}|${temp.sender_type}|${temp.created_at?.slice(0, 19)}`
              return !serverMsgMap.has(key)
            })
            
            // 合并服务端消息和本地真实消息，避免服务端返回部分数据时丢失本地消息
            const localMsgMap = new Map<string, Message>()
            realMessages.forEach((m: Message) => {
              localMsgMap.set(m.id, m)
            })
            serverMessages.forEach((m: Message) => {
              localMsgMap.set(m.id, m) // 服务端消息优先
            })
            
            return [...Array.from(localMsgMap.values()), ...stillPending]
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
          // 更新本地 booking 状态
          setBooking(prev => prev ? normalizeBooking({ ...prev, ...newRecord }) : null)
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

  // 用户端：booking 数据加载后，若师傅已邀请评价且未评价，自动弹出评价窗
  useEffect(() => {
    if (!isMaster && booking?.review_requested && !booking?.review_data && !showReview) {
      setShowReview(true)
      setReviewMode('edit')
    }
  }, [booking?.review_requested, booking?.review_data])

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
    if (consultStatus === 'completed') return
    if (!isMaster && consultStatus === 'ended') return
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('[chat] sendTypingStatus: no session')
        return
      }
      await fetch(`/api/chat/${bookingId}/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
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
    // 用户端：completed 后不能发图；ended 后也不能发；师傅端：随时可以发
    if (consultStatus === 'completed' || (consultStatus === 'ended' && !isMaster)) return

    // 前端：咨询未开始时检查5条限制
    if (consultStatus === 'not_started' && !isMaster && preConsultMsgCount >= PRE_CONSULT_LIMIT) {
      alert(isZh
        ? `已达到咨询前消息上限（${PRE_CONSULT_LIMIT}条），请等待预约时间正式开始对话`
        : `Pre-consultation message limit reached (${PRE_CONSULT_LIMIT}). Please wait for the scheduled time.`
      )
      return
    }

    // 1. 前端压缩图片
    const compressedFile = await compressImage(file, 1920, 0.8)
    if (!compressedFile) {
      alert(isZh ? '图片压缩失败，请重试' : 'Image compression failed, please retry')
      return
    }

    const finalFile = compressedFile || file

    setUploadingImage(true)
    setImageUploadProgress(0)

    let lastError: any = null

    try {
      // 最多重试3次
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) {
            console.error('[chat] uploadImageFile: no session')
            alert(isZh ? '登录已过期，请重新登录' : 'Session expired, please login again')
            return
          }

          // 2. 获取预签名上传 URL
          const urlRes = await fetchWithTimeout(`/api/chat/${bookingId}/upload-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Bearer ${session.access_token}`,
            },
            credentials: 'include',
            body: JSON.stringify({ fileExt: finalFile.name.split('.').pop() || 'jpg' }),
          }, 10000)

          if (!urlRes.ok) {
            const err = await urlRes.json()
            throw new Error(err.error || 'Failed to get upload URL')
          }

          const { signedUrl, path } = await urlRes.json()

          // 3. 直传 Supabase Storage，带进度跟踪
          const uploadedUrl = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest()

            xhr.upload.addEventListener('progress', (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100)
                setImageUploadProgress(progress)
              }
            })

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                // 上传成功，构造 public URL
                const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path)
                resolve(urlData.publicUrl)
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`))
              }
            })

            xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
            xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

            xhr.open('PUT', signedUrl, true)
            xhr.setRequestHeader('Content-Type', finalFile.type || 'image/jpeg')
            xhr.send(finalFile)
          })

          // 4. 发送消息
          const res = await fetch(`/api/chat/${bookingId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Bearer ${session.access_token}`,
            },
            credentials: 'include',
            body: JSON.stringify({ image_url: uploadedUrl }),
          })

          if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || 'Image send failed')
          }

          // 成功，退出重试循环
          return
        } catch (err: any) {
          lastError = err
          console.error(`[chat] Image upload attempt ${attempt} failed:`, err)
          // 如果不是最后一次尝试，延迟后重试
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, attempt * 1000))
            setImageUploadProgress(0)
          }
        }
      }

      // 3次都失败了
      alert(isZh ? `上传失败: ${lastError?.message || '请检查网络后重试'}` : `Upload failed: ${lastError?.message || 'Please check network and retry'}`)
    } finally {
      setUploadingImage(false)
      setImageUploadProgress(0)
    }
  }

  const [isNetworkOffline, setIsNetworkOffline] = useState(false)
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set())
  const retryInProgressRef = useRef(false)

  // 网络状态监听 + 离线队列自动重试
  useEffect(() => {
    const cleanup = onNetworkChange((online) => {
      setIsNetworkOffline(!online)
      if (online && !retryInProgressRef.current) {
        retryOfflineMessages()
      }
    })
    // 初始化时检查一次
    setIsNetworkOffline(!isNetworkOnline())
    return cleanup
  }, [bookingId])

  // 加载时恢复离线队列消息到列表
  useEffect(() => {
    if (!bookingId || messages.length > 0) return
    const queue = getOfflineQueue(bookingId)
    if (queue.length > 0) {
      const offlineMsgs: Message[] = queue.map((q) => ({
        id: q.id,
        booking_id: q.bookingId,
        sender_id: q.sender_id,
        sender_type: q.sender_type,
        sender_name: q.sender_name,
        content: q.content,
        image_url: q.image_url,
        audio_url: q.audio_url,
        audio_duration: q.audio_duration,
        created_at: q.created_at,
        read_at: null,
        source: 'offline',
      }))
      setMessages((prev) => {
        if (prev.length > 0) return prev
        return offlineMsgs
      })
      setPendingMessages(new Set(queue.map((q) => q.id)))
    }
  }, [bookingId])

  // 自动重试离线队列中的消息
  const retryOfflineMessages = async () => {
    if (!bookingId || retryInProgressRef.current) return
    const queue = getOfflineQueue(bookingId)
    if (queue.length === 0) return

    retryInProgressRef.current = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      for (const msg of queue) {
        try {
          const body: any = {}
          if (msg.content) body.content = msg.content
          if (msg.image_url) body.image_url = msg.image_url
          if (msg.audio_url) body.audio_url = msg.audio_url
          if (msg.audio_duration) body.audio_duration = msg.audio_duration

          const res = await fetch(`/api/chat/${bookingId}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              authorization: `Bearer ${session.access_token}`,
            },
            credentials: 'include',
            body: JSON.stringify(body),
          })

          if (res.ok) {
            removeFromOfflineQueue(bookingId, msg.id)
            setPendingMessages((prev) => {
              const next = new Set(prev)
              next.delete(msg.id)
              return next
            })
          } else {
            updateOfflineQueue(bookingId, msg.id, { attempts: msg.attempts + 1 })
          }
        } catch (e) {
          updateOfflineQueue(bookingId, msg.id, { attempts: msg.attempts + 1 })
        }
      }
    } finally {
      retryInProgressRef.current = false
    }
  }

  // 手动重试单条消息（独立管理状态）
  const retrySingleMessage = async (msg: Message) => {
    if (!bookingId || !msg.content || isSending) return
    setPendingMessages((prev) => new Set(prev).add(msg.id))
    setIsSending(true) // 重试时锁定输入框

    try {
      console.log('[chat:retry] Start', { msgId: msg.id, content: msg.content.slice(0, 20) })
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        alert(isZh ? '登录已过期' : 'Session expired')
        return
      }

      const res = await fetchWithTimeout(`/api/chat/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ content: msg.content }),
      }, 10000)

      console.log('[chat:retry] Response', { status: res.status, ok: res.ok })

      if (res.ok) {
        const json = await res.json()
        if (json.message) {
          removeFromOfflineQueue(bookingId, msg.id)
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? json.message : m)))
          setPendingMessages((prev) => {
            const next = new Set(prev)
            next.delete(msg.id)
            return next
          })
        }
      } else {
        alert(isZh ? '重试失败' : 'Retry failed')
      }
    } catch (e: any) {
      console.error('[chat:retry] Error:', e)
      if (e.message === 'Request timeout') {
        alert(isZh ? '重试超时，请检查网络' : 'Retry timed out, check network')
      } else {
        alert(isZh ? '重试失败，请检查网络' : 'Retry failed, check network')
      }
    } finally {
      setIsSending(false)
      setPendingMessages((prev) => {
        const next = new Set(prev)
        next.delete(msg.id)
        return next
      })
    }
  }

  // ===== Voice Engine v1.0: Stable Voice Message System =====
  const startRecording = async () => {
    const logPrefix = '[VoiceEngine]';
    const startTime = Date.now();
    
    try {
      // 1. Check permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 2. Detect browser format
      const { mimeType, ext } = getAudioFormat();
      console.log(`${logPrefix} Browser format detected: ${mimeType || 'default'}, ext: ${ext}`);
      
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setVoiceError(null);
      setRetryAudio(null);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordEndTime = Date.now();
        const recordDuration = recordEndTime - startTime;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        console.log(`${logPrefix} Recording stopped`, {
          blobSize: audioBlob.size,
          duration: recordDuration,
          format: ext,
          chunks: audioChunksRef.current.length,
        });

        // 3. Validate size (10MB max)
        if (audioBlob.size > MAX_AUDIO_SIZE) {
          setVoiceState({ status: 'failed', error: isZh ? '语音文件过大，请缩短录制时间' : 'Audio too large, please shorten' });
          setVoiceError(isZh ? '语音文件过大，请缩短录制时间' : 'Audio too large');
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        // 4. Store blob for retry capability
        setRetryAudio({ blob: audioBlob, duration: recordingDurationRef.current });
        
        // 5. Upload with state machine
        uploadAudioV2(audioBlob, recordingDurationRef.current, ext, mimeType);
        
        // 6. Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error(`${logPrefix} MediaRecorder error:`, event);
        setVoiceState({ status: 'failed', error: isZh ? '录音失败，请重试' : 'Recording failed' });
        setVoiceError(isZh ? '录音失败，请重试' : 'Recording failed');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceState({ status: 'recording' });
      setRecordingDuration(0);
      recordingDurationRef.current = 0;

      // 7. Start timer with 180s limit
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const next = prev + 1;
          recordingDurationRef.current = next;
          
          // Auto-stop at 180 seconds
          if (next >= MAX_RECORDING_SECONDS) {
            console.log(`${logPrefix} Auto-stopping at max duration: ${MAX_RECORDING_SECONDS}s`);
            stopRecording();
          }
          
          return next;
        });
      }, 1000);
      
      console.log(`${logPrefix} Recording started`, { format: ext, mimeType, maxDuration: MAX_RECORDING_SECONDS });
    } catch (err) {
      console.error(`${logPrefix} Recording start error:`, err);
      setVoiceState({ status: 'failed', error: isZh ? '无法访问麦克风，请检查权限设置' : 'Cannot access microphone' });
      setVoiceError(isZh ? '无法访问麦克风，请检查权限设置' : 'Cannot access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setVoiceState({ status: 'uploading' });
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const uploadAudioV2 = async (blob: Blob, duration: number, format: string, mimeType: string) => {
    const logPrefix = '[VoiceEngine]';
    const uploadStart = Date.now();
    
    if (consultStatus === 'completed' || (consultStatus === 'ended' && !isMaster)) return;
    if (consultStatus === 'not_started' && !isMaster && preConsultMsgCount >= PRE_CONSULT_LIMIT) {
      alert(isZh
        ? `已达到咨询前消息上限（${PRE_CONSULT_LIMIT}条），请等待预约时间正式开始对话`
        : `Pre-consultation message limit reached (${PRE_CONSULT_LIMIT}). Please wait for the scheduled time.`
      );
      return;
    }

    // 1. Create optimistic message placeholder
    const tempId = `temp-voice-${Date.now()}`;
    const objectURL = URL.createObjectURL(blob);
    objectURLsRef.current.push(objectURL);
    
    const optimisticVoiceMsg: Message = {
      id: tempId,
      booking_id: bookingId,
      sender_id: user?.id || '',
      sender_type: isMaster ? 'master' : 'user',
      sender_name: isMaster ? 'Master' : (user?.user_metadata?.full_name || user?.email || 'User'),
      content: null,
      image_url: null,
      audio_url: objectURL, // Local URL for immediate playback
      audio_duration: duration,
      created_at: new Date().toISOString(),
      read_at: null,
      source: 'chat',
    };

    setMessages((prev) => [...prev, optimisticVoiceMsg]);
    setVoiceState({ status: 'uploading', progress: 0 });
    setUploadingAudio(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error(`${logPrefix} No session`);
        setVoiceState({ status: 'failed', error: isZh ? '登录已过期' : 'Session expired' });
        return;
      }
      
      const formData = new FormData();
      formData.append('file', blob, `recording_${Date.now()}.${format}`);
      formData.append('duration', duration.toString());
      formData.append('sender_type', isMaster ? 'master' : 'user');
      formData.append('browser_type', navigator.userAgent);

      console.log(`${logPrefix} Upload started`, { size: blob.size, duration, format });

      const uploadRes = await fetchWithTimeout(`/api/chat/${bookingId}/upload-audio`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: formData,
      }, 15000);

      const uploadDuration = Date.now() - uploadStart;
      console.log(`${logPrefix} Upload completed`, { duration: uploadDuration, status: uploadRes.status });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        console.error(`${logPrefix} Upload failed`, { status: uploadRes.status, error: err.error, code: err.code });
        throw new Error(err.error || 'Upload failed');
      }

      const uploadData = await uploadRes.json();
      setVoiceState({ status: 'sending' });

      // 2.5 URL accessibility check (CDN sync delay)
      let urlReady = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const headRes = await fetch(uploadData.audio_url, { method: 'HEAD', mode: 'no-cors' });
          if (headRes.ok || headRes.status === 0) {
            urlReady = true;
            break;
          }
        } catch (e) {
          console.log(`${logPrefix} URL not ready, attempt ${attempt + 1}/3`);
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }

      // 2. Send message with uploaded URL
      const msgStart = Date.now();
      const res = await fetchWithTimeout(`/api/chat/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          audio_url: uploadData.audio_url,
          audio_duration: uploadData.duration,
        }),
      }, 10000);

      const msgDuration = Date.now() - msgStart;
      console.log(`${logPrefix} Message created`, { duration: msgDuration, status: res.status });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Send failed');
      }

      const json = await res.json();
      
      // 3. Replace optimistic message with real one
      setMessages((prev) => {
        if (prev.some((m) => m.id === json.message?.id)) return prev;
        return prev.map((m) => m.id === tempId ? { ...json.message, audio_url: uploadData.audio_url } : m);
      });
      
      setVoiceState({ status: 'sent' });
      setVoiceError(null);
      setRetryAudio(null);
      
    } catch (err: any) {
      console.error(`${logPrefix} Voice chain failed:`, err.message);
      setVoiceState({ status: 'failed', error: err.message });
      setVoiceError(err.message);
      
      // Mark optimistic message as failed
      setMessages((prev) => prev.map((m) => 
        m.id === tempId ? { ...m, voice_status: 'failed' as any } : m
      ));
    } finally {
      setUploadingAudio(false);
    }
  };

  const retrySendAudio = async () => {
    if (!retryAudio) return;
    const { blob, duration } = retryAudio;
    const { mimeType, ext } = getAudioFormat();
    // Use original blob's type if available, otherwise use detected format
    const actualMimeType = blob.type || mimeType;
    const actualExt = actualMimeType.includes('webm') ? 'webm' : (actualMimeType.includes('mp4') || actualMimeType.includes('aac') ? 'm4a' : ext);
    uploadAudioV2(blob, duration, actualExt, actualMimeType);
  };

  const playAudio = (msgId: string, audioUrl: string) => {
    if (audioPlayingId === msgId) {
      audioRef.current?.pause();
      setAudioPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setAudioPlayingId(null);
      audio.onerror = () => {
        console.error('[VoiceEngine] Audio playback error, will retry in 2s:', audioUrl);
        // 延迟2秒后重试，给CDN缓存时间
        setTimeout(() => {
          const retryAudio = new Audio(audioUrl + '?t=' + Date.now());
          retryAudio.oncanplaythrough = () => {
            retryAudio.play().catch(err => console.error('[VoiceEngine] Retry play failed:', err));
          };
          retryAudio.onerror = () => {
            console.error('[VoiceEngine] Retry also failed');
            alert(isZh ? '语音加载失败，请稍后重试' : 'Audio load failed, please retry later');
            setAudioPlayingId(null);
          };
          retryAudio.preload = 'auto';
          retryAudio.load();
        }, 2000);
      };
      audio.preload = 'auto';
      audio.play().catch(err => {
        console.error('[VoiceEngine] Audio play error:', err);
      });
      setAudioPlayingId(msgId);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseObjectURLs();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current = null;
      }
    };
  }, []);

  // visibilitychange 监听：页面切后台/前台时记录事件
  useEffect(() => {
    const role = isMaster ? 'master' : 'user'
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logChatEvent({
          booking_id: bookingId,
          role,
          event_type: ChatEventTypes.PAGE_HIDDEN,
          metadata: { visibility_state: 'hidden' },
        }).catch(() => {})
      } else {
        logChatEvent({
          booking_id: bookingId,
          role,
          event_type: ChatEventTypes.PAGE_VISIBLE,
          metadata: { visibility_state: 'visible' },
        }).catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [bookingId, isMaster])

  // 图片预览弹窗
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  // 通用 fetch 超时封装
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw err
  }
}

  const handleSend = async () => {
    const content = inputValue.trim()
    if (!content || isSending) return
    // ended 状态：用户不能发，师傅可以发（收尾阶段）
    if (consultStatus === 'ended' && !isMaster) {
      alert(isZh ? '咨询已结束，您不能继续发送消息' : 'Consultation ended. You cannot send more messages.')
      return
    }
    // completed 状态：双方都不能发
    if (consultStatus === 'completed') {
      alert(isZh ? '咨询已完全结束' : 'Consultation fully completed.')
      return
    }

    // 前端：咨询未开始时检查5条限制
    if (consultStatus === 'not_started' && !isMaster && preConsultMsgCount >= PRE_CONSULT_LIMIT) {
      alert(isZh
        ? `已达到咨询前消息上限（${PRE_CONSULT_LIMIT}条），请等待预约时间正式开始对话`
        : `Pre-consultation message limit reached (${PRE_CONSULT_LIMIT}). Please wait for the scheduled time.`
      )
      return
    }

    const requestId = generateRequestId()
    const role = isMaster ? 'master' : 'user'

    // 发送事件：发送开始
    logChatEvent({
      booking_id: bookingId,
      request_id: requestId,
      role,
      event_type: ChatEventTypes.SEND_START,
      metadata: { content_type: 'text' },
    }).catch(() => {})

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
    setIsSending(true)

    // 移动端修复：延迟 focus，让消息先渲染到 DOM 再弹出键盘，避免 scrollToBottom 冲突
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('[chat] handleSend: no session')
        alert(isZh ? '登录已过期，请重新登录' : 'Session expired, please login again')
        router.push('/auth/login?redirect=' + encodeURIComponent(`/chat/${bookingId}`))
        return
      }
      
      console.log('[chat:send] API request start', { bookingId, content: content.slice(0, 20) })
      
      const res = await fetchWithTimeout(`/api/chat/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
          'X-Request-ID': requestId,
        },
        credentials: 'include',
        body: JSON.stringify({ content: content }),
      }, 10000)

      console.log('[chat:send] API response', { status: res.status, ok: res.ok })

      if (res.ok) {
        const json = await res.json()
        if (json.message) {
          // 用服务端返回的真实消息替换临时消息
          setMessages((prev) => {
            // 如果服务端消息已经通过轮询进入数组，避免重复
            if (prev.some((m) => m.id === json.message.id)) return prev
            return prev.map((m) => m.id === tempId ? json.message : m)
          })
        } else {
          // 后端返回200但message为null — 标记为失败，存入离线队列
          console.error('[chat] API returned 200 but no message:', json)
          addToOfflineQueue(bookingId, {
            id: tempId,
            bookingId,
            content,
            image_url: null,
            audio_url: null,
            audio_duration: null,
            sender_type: isMaster ? 'master' : 'user',
            sender_name: optimisticMsg.sender_name,
            sender_id: user?.id || '',
            created_at: optimisticMsg.created_at,
            attempts: 1,
          })
          setPendingMessages((prev) => new Set(prev).add(tempId))
          alert(isZh ? '发送失败，已暂存到本地，网络恢复后自动重试' : 'Send failed, saved locally. Will retry when network recovers.')
        }
      } else {
        const err = await res.json()
        // 发送失败 — 存入离线队列，显示重试提示
        console.error('[chat] Send failed:', err)
        addToOfflineQueue(bookingId, {
          id: tempId,
          bookingId,
          content,
          image_url: null,
          audio_url: null,
          audio_duration: null,
          sender_type: isMaster ? 'master' : 'user',
          sender_name: optimisticMsg.sender_name,
          sender_id: user?.id || '',
          created_at: optimisticMsg.created_at,
          attempts: 1,
          lastError: err.error || 'Send failed',
        })
        setPendingMessages((prev) => new Set(prev).add(tempId))
        alert(isZh ? '发送失败，已暂存到本地，可点击消息重试' : 'Send failed, saved locally. Click message to retry.')
      }
    } catch (err) {
      console.error('Send error:', err)
      // 网络异常 — 存入离线队列
      addToOfflineQueue(bookingId, {
        id: tempId,
        bookingId,
        content,
        image_url: null,
        audio_url: null,
        audio_duration: null,
        sender_type: isMaster ? 'master' : 'user',
        sender_name: optimisticMsg.sender_name,
        sender_id: user?.id || '',
        created_at: optimisticMsg.created_at,
        attempts: 1,
        lastError: err instanceof Error ? err.message : 'Network error',
      })
      setPendingMessages((prev) => new Set(prev).add(tempId))
      alert(isZh ? '网络异常，消息已暂存到本地，恢复后自动重试' : 'Network error, message saved locally. Will retry when network recovers.')
    } finally {
      setIsSending(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || consultStatus === 'completed' || (consultStatus === 'ended' && !isMaster)) return

    console.log('[ImageUpload] Selected file:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // 前端大小检查（10MB）
    if (file.size > 10 * 1024 * 1024) {
      alert(isZh ? '图片超过10MB限制，请选择更小的图片' : 'Image exceeds 10MB limit, please choose a smaller image')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

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
      let uploadFile = file

      // 图片压缩：大于1MB或HEIC格式时压缩
      const needsCompression = file.size > 1 * 1024 * 1024 || file.type === 'image/heic' || file.type === 'image/heif'
      if (needsCompression) {
        console.log('[ImageUpload] Compressing image...');
        const compressed = await compressImage(file, 1920, 0.8)
        if (compressed) {
          uploadFile = compressed
          console.log('[ImageUpload] Compressed:', {
            originalSize: file.size,
            compressedSize: uploadFile.size,
            type: uploadFile.type,
          });
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', uploadFile)

      console.log('[ImageUpload] Uploading to API...');
      const uploadRes = await fetchWithTimeout(`/api/chat/${bookingId}/upload-image`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: formData,
      }, 15000)

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        console.error('[ImageUpload] API error:', err);
        
        // 明确错误提示
        let errorMsg = err.error || 'Upload failed'
        if (errorMsg.includes('10MB')) {
          errorMsg = isZh ? '图片超过10MB，请压缩后重试' : 'Image exceeds 10MB, please compress and retry'
        } else if (errorMsg.includes('image')) {
          errorMsg = isZh ? '仅支持图片文件（jpg/png/webp）' : 'Only image files supported (jpg/png/webp)'
        } else if (uploadRes.status === 403) {
          errorMsg = isZh ? '无权限上传图片' : 'No permission to upload'
        } else if (uploadRes.status === 413) {
          errorMsg = isZh ? '文件过大，请压缩后重试' : 'File too large, please compress and retry'
        }
        
        alert(errorMsg)
        return
      }

      const uploadData = await uploadRes.json()
      const imageUrl = uploadData.image_url

      console.log('[ImageUpload] Upload success, sending message...');
      const res = await fetchWithTimeout(`/api/chat/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ image_url: imageUrl }),
      }, 10000)

      if (!res.ok) {
        const err = await res.json()
        console.error('[ImageUpload] Message send error:', err);
        alert(err.error || (isZh ? '发送图片失败' : 'Image send failed'))
      } else {
        console.log('[ImageUpload] Message sent successfully');
      }
      // preConsultMsgCount 已从 messages 派生，无需乐观更新
    } catch (err: any) {
      console.error('[ImageUpload] Error:', err)
      if (err.message === 'Request timeout') {
        alert(isZh ? '上传超时，请检查网络后重试' : 'Upload timed out, check network and retry')
      } else {
        alert(err.message || (isZh ? '上传失败，请重试' : 'Upload failed, please retry'))
      }
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

  // 访问错误：显示错误页面而非空框架
  if (accessError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 mb-2">
            {accessError.status === 403
              ? (isZh ? '无权访问' : 'Access Denied')
              : (isZh ? '加载失败' : 'Loading Failed')
            }
          </h2>
          <p className="text-stone-500 mb-6">{accessError.message}</p>
          <Link
            href={isMaster ? '/master/dashboard' : '/user/dashboard'}
            className="inline-flex items-center justify-center px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
          >
            {isZh ? '返回 dashboard' : 'Back to Dashboard'}
          </Link>
        </div>
      </div>
    )
  }

  const master = booking ? masters[booking.master_id] : null
  const service = booking ? services[booking.service_id] : null
  const canComplete = booking?.status === 'in_progress' && consultStatus !== 'ended'
  // 严格区分：completed = 后端标记完成；ended = 倒计时结束但尚未 completed
  const isCompleted = consultStatus === 'completed'
  const isEnded = consultStatus === 'ended' || consultStatus === 'completed'
  // 师傅可邀请评价：订单已结束（ended 或 completed），且是师傅身份
  const canRequestReview = isMaster && isEnded

  return (
    <div className="min-h-[100svh] h-[100svh] bg-gradient-to-br from-stone-50 to-stone-100 flex flex-col">
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
              {isZh ? master?.nameCn : master?.name} · {booking?.scheduled_date} {booking?.scheduled_time ? booking.scheduled_time.split(':').slice(0, 2).join(':') : formatDisplayTime(booking?.scheduled_at || '')}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
              countdownSeconds <= 300 && consultStatus === 'in_progress'
                ? 'bg-red-100 text-red-700'
                : 'bg-stone-100 text-stone-600'
            }`}>
              <Clock className="w-3 h-3 shrink-0" />
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
                    ? (isZh ? '未开始' : 'Wait')
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

      {(() => {
        const banner = getConsultStatusBanner()
        if (!banner) return null
        return (
          <div className="flex-shrink-0 px-4 py-4 bg-amber-50 border-b border-amber-200">
            <div className="max-w-3xl mx-auto text-sm sm:text-base text-amber-900 font-semibold text-center leading-relaxed">
              {banner.text}
            </div>
          </div>
        )
      })()}

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto pt-6 pb-24 px-4 relative">
        <div className="max-w-3xl mx-auto space-y-4">
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
                  {msg.content && (
                    <div className="text-sm whitespace-pre-wrap">
                      {(() => {
                        const MAX_LEN = 300
                        const displayContent = msg.content
                        const isLong = displayContent.length > MAX_LEN
                        const isExpanded = expandedMessages.has(msg.id)
                        
                        if (!isLong) return displayContent
                        
                        return (
                          <div>
                            {isExpanded ? displayContent : displayContent.slice(0, MAX_LEN) + '...'}
                            <button
                              className="text-xs ml-1 underline opacity-70 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedMessages((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(msg.id)) {
                                    next.delete(msg.id)
                                  } else {
                                    next.add(msg.id)
                                  }
                                  return next
                                })
                              }}
                            >
                              {isExpanded ? (isZh ? '收起' : 'Collapse') : (isZh ? '展开' : 'Expand')}
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                    {msg.image_url && (
                      <img
                        src={msg.image_url}
                        alt="Chat image"
                        className="mt-2 max-w-full rounded-lg cursor-pointer object-cover"
                        loading="lazy"
                        onClick={() => setPreviewImage(msg.image_url!)}
                      />
                    )}
                  {msg.audio_url && (
                    <div className="mt-2">
                      {/* Voice Engine v1.0: 状态机渲染 */}
                      {(() => {
                        const status = msg.voice_status;
                        const isTemp = msg.id.startsWith('temp-voice-');
                        
                        if (status === 'uploading' || status === 'sending' || (isTemp && !status)) {
                          return (
                            <div className="flex items-center gap-2 text-xs text-violet-200">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{status === 'uploading' ? (isZh ? '上传中...' : 'Uploading...') : (isZh ? '发送中...' : 'Sending...')}</span>
                              <span className="text-violet-300/60">{formatDuration(msg.audio_duration || 0)}</span>
                            </div>
                          );
                        }
                        
                        if ((status as any) === 'failed' || (isTemp && (status as any) === 'failed')) {
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2 bg-red-500/20 rounded-full px-3 py-1.5">
                                <span className="text-xs text-red-200">{isZh ? '发送失败' : 'Send failed'}</span>
                                <span className="text-xs text-red-300/60">{formatDuration(msg.audio_duration || 0)}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-violet-200 hover:text-white hover:bg-violet-500/30"
                                onClick={() => retrySendAudio()}
                              >
                                {isZh ? '重新发送' : 'Retry'}
                              </Button>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="flex items-center gap-2">
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
                        );
                      })()}
                    </div>
                  )}
                  {/* 未发送状态 - 仅自己消息且未发送成功时显示 */}
                  {isMe && pendingMessages.has(msg.id) && (
                    <div className="flex justify-end mt-1 gap-1 items-center">
                      <span className="text-[10px] text-red-300 flex items-center gap-1">
                        ⚠️ {isZh ? '未发送' : 'Not sent'}
                      </span>
                      <button
                        className="text-[10px] text-white underline hover:text-violet-200 px-1"
                        onClick={() => retrySingleMessage(msg)}
                      >
                        {isZh ? '重试' : 'Retry'}
                      </button>
                    </div>
                  )}
                  {/* 已读状态 - 仅自己消息且已发送成功时显示 */}
                  {isMe && !pendingMessages.has(msg.id) && (
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

      {/* 输入区域 — 固定底部，防止键盘弹出时跳动 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3 z-50">
        <div className="max-w-3xl mx-auto">
          {/* 已结束 - 只读提示 */}
          {isCompleted && (
            <div className="flex items-center justify-center gap-2 py-2">
              <p className="text-stone-400 text-sm">
                {isZh ? '✅ 咨询已完全结束' : '✅ Consultation fully completed.'}
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
                className="shrink-0 relative"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <div className="relative w-4 h-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                  </div>
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
                {uploadingImage && imageUploadProgress > 0 && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] bg-stone-800 text-white px-1.5 py-0.5 rounded whitespace-nowrap">
                    {imageUploadProgress}%
                  </span>
                )}
              </Button>
              {/* 录音按钮 */}
              {isRecording && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex flex-col items-center justify-center gap-4 animate-in fade-in duration-200"
                  onClick={() => {
                    // 点击背景不停止，必须点击按钮或松手
                  }}
                >
                  <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl">
                    <div className="flex items-center gap-1 h-8">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full animate-pulse ${isCanceling ? 'bg-stone-400' : 'bg-red-500'}`}
                          style={{
                            height: `${Math.max(20, Math.random() * 100)}%`,
                            animationDelay: `${i * 80}ms`,
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-lg font-bold text-stone-800">{formatDuration(recordingDuration)}</p>
                    <p className={`text-sm ${isCanceling ? 'text-red-500 font-bold' : 'text-stone-500'}`}>
                      {isCanceling
                        ? (isZh ? '松开手指取消发送' : 'Release to cancel')
                        : recordingDuration >= MAX_RECORDING_SECONDS
                          ? (isZh ? '已达到最长录制时间' : 'Maximum recording time reached')
                          : (isZh ? '录音请勿超过3分钟，松手停止录音' : 'Recording max 3min, release to stop')}
                    </p>
                    <Button
                      size="lg"
                      className={`rounded-full w-16 h-16 flex items-center justify-center ${isCanceling ? 'bg-stone-400' : 'bg-red-500 hover:bg-red-600'} text-white`}
                      onClick={stopRecording}
                    >
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </Button>
                  </div>
                </div>
              )}
              <Button
                variant={isRecording ? 'default' : 'outline'}
                size="icon"
                className={`shrink-0 ${isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                onClick={isRecording ? undefined : startRecording}
                onTouchStart={(e) => {
                  // 移动端：按住开始录制
                  if (!isRecording && !uploadingImage && !uploadingAudio) {
                    e.preventDefault()
                    touchStartYRef.current = e.touches[0].clientY
                    touchStartXRef.current = e.touches[0].clientX
                    setIsPressing(true)
                    setIsCanceling(false)
                    startRecording()
                  }
                }}
                onTouchEnd={(e) => {
                  if (isRecording) {
                    e.preventDefault()
                    setIsPressing(false)
                    if (isCanceling) {
                      // 取消录制：停止但不发送
                      stopRecording()
                      // 清空已录制的 blob
                      setRetryAudio(null)
                      setVoiceError(null)
                      setVoiceState({ status: 'idle' })
                    } else {
                      stopRecording()
                    }
                    setIsCanceling(false)
                  }
                }}
                onTouchMove={(e) => {
                  if (isRecording && touchStartYRef.current !== 0) {
                    const currentY = e.touches[0].clientY
                    const deltaY = touchStartYRef.current - currentY
                    // 上滑超过 80px 标记为取消
                    if (deltaY > 80) {
                      setIsCanceling(true)
                    } else if (deltaY < 40) {
                      setIsCanceling(false)
                    }
                  }
                }}
                disabled={uploadingImage || uploadingAudio}
              >
                {isRecording ? (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                ) : uploadingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
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
