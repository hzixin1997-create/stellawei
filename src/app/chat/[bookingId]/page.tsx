'use client'
// cache-bust: 2026-05-29-chat-api-v4

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
import { isMasterEmail } from '@/lib/master-auth'

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
  }
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

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

      let newStatus: 'not_started' | 'in_progress' | 'ended' | 'completed'
      const WRAP_UP_MS = 10 * 60 * 1000 // 10分钟收尾阶段

      if (now < scheduledTime) {
        newStatus = 'not_started'
      } else if (now >= scheduledTime && now < endTime) {
        newStatus = 'in_progress'
      } else if (now >= endTime && now < endTime + WRAP_UP_MS) {
        newStatus = 'ended' // 收尾阶段
      } else {
        newStatus = 'completed' // 超过收尾阶段，完全结束
      }

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

  // 从 scheduled_at 解析显示时间（东八区），不依赖 scheduled_time 字段
  const formatDisplayTime = (isoString: string): string => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return ''
      // 根治：直接用 toLocaleString 转东八区，避免 Intl.DateTimeFormat 兼容问题
      return d.toLocaleTimeString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    } catch (e) {
      return ''
    }
  }

  // 根治：格式化日期+时间，统一用东八区
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
      const timeStr = d.toLocaleTimeString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      return `${dateStr} ${timeStr}`
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

    setUploadingImage(true)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('[chat] uploadImageFile: no session')
        alert(isZh ? '登录已过期，请重新登录' : 'Session expired, please login again')
        return
      }
      
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`/api/chat/${bookingId}/upload-image`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
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
          authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
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
    if (consultStatus === 'completed' || (consultStatus === 'ended' && !isMaster)) return
    if (consultStatus === 'not_started' && !isMaster && preConsultMsgCount >= PRE_CONSULT_LIMIT) {
      alert(isZh
        ? `已达到咨询前消息上限（${PRE_CONSULT_LIMIT}条），请等待预约时间正式开始对话`
        : `Pre-consultation message limit reached (${PRE_CONSULT_LIMIT}). Please wait for the scheduled time.`
      )
      return
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error('[chat] uploadAudio: no session')
        alert(isZh ? '登录已过期，请重新登录' : 'Session expired, please login again')
        return
      }
      
      const formData = new FormData()
      formData.append('file', blob, `recording_${Date.now()}.webm`)
      formData.append('duration', duration.toString())

      const uploadRes = await fetch(`/api/chat/${bookingId}/upload-audio`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
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
          authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
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
  // Force rebuild: chat core fix v6 - countdown via scheduled_at + message merge

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
      
      const res = await fetch(`/api/chat/${bookingId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ content }),
      })

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
          // 后端返回200但message为null — 保留临时消息，标记为"发送中"失败
          console.error('[chat] API returned 200 but no message:', json)
          alert(isZh ? '发送失败，请重试' : 'Send failed, please retry')
        }
      } else {
        const err = await res.json()
        // 发送失败 — 保留临时消息（带错误标记），让用户知道失败
        console.error('[chat] Send failed:', err)
        alert(err.error || 'Send failed')
      }
    } catch (err) {
      console.error('Send error:', err)
      alert(isZh ? '发送失败，请重试' : 'Send failed, please retry')
    } finally {
      setIsSending(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || consultStatus === 'completed' || (consultStatus === 'ended' && !isMaster)) return

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
  // 严格区分：completed = 后端标记完成；ended = 倒计时结束但尚未 completed
  const isCompleted = consultStatus === 'completed'
  const isEnded = consultStatus === 'ended' || consultStatus === 'completed'
  // 师傅可邀请评价：订单已完成/已结束，且是师傅身份
  const canRequestReview = isMaster && isCompleted

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
