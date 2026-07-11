'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import BookingCalendar from '@/components/BookingCalendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Clock, Sparkles, Compass, Sun, Video, MessageSquare, Loader2, Tag, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'

// ===== 数据结构 =====

// 咨询方向
const CONSULTATION_TOPICS = [
  { id: 'love', nameZh: '感情', nameEn: 'Love & Relationships', placeholderZh: '例如：最近和对象关系紧张，不知道是否该继续...', placeholderEn: 'e.g., My relationship has been tense lately...' },
  { id: 'career', nameZh: '事业', nameEn: 'Career', placeholderZh: '例如：面临两个工作机会，不知道哪个更适合我...', placeholderEn: 'e.g., I have two job offers and am unsure which to choose...' },
  { id: 'wealth', nameZh: '财运', nameEn: 'Wealth', placeholderZh: '例如：最近投资不顺，想问问未来半年的财运走向...', placeholderEn: 'e.g., My investments have not been going well lately...' },
  { id: 'health', nameZh: '健康', nameEn: 'Health', placeholderZh: '例如：最近睡眠质量差，想知道是不是和运势有关...', placeholderEn: 'e.g., I have been having poor sleep quality lately...' },
  { id: 'other', nameZh: '其他', nameEn: 'Other', placeholderZh: '例如：我最近在工作上遇到了瓶颈，想问问关于职业发展的建议...', placeholderEn: 'e.g., I have been facing a bottleneck at work...' },
]

// 咨询大类
const CATEGORIES = [
  { id: 'tarot', nameZh: '塔罗占卜', nameEn: 'Tarot Reading', icon: Sparkles, color: 'from-violet-500 to-purple-600' },
  { id: 'eastern', nameZh: '东方占卜', nameEn: 'Eastern Divination', icon: Compass, color: 'from-amber-500 to-orange-600' },
  { id: 'spiritual', nameZh: '灵性探索', nameEn: 'Spiritual Exploration', icon: Sun, color: 'from-cyan-500 to-blue-600' },
]

// 咨询方式
const CONSULTATION_TYPES = [
  { 
    id: 'realtime', 
    nameZh: '实时咨询', 
    nameEn: 'Real-time',
    descZh: '预约时间与师傅进行实时文字/图片对话',
    descEn: 'Schedule a real-time text/image chat with your master',
    icon: Video,
  },
  { 
    id: 'message', 
    nameZh: '留言咨询', 
    nameEn: 'Message',
    descZh: '通过文字留言提问，师傅会在24小时内回复',
    descEn: 'Submit questions via message, master replies within 24h',
    icon: MessageSquare,
  },
]

// 师傅（包含更多信息用于卡片展示）
const MASTERS = [
  { 
    id: 'wu-yang', 
    name: 'Master Wu Yang', 
    nameCn: '戊阳',
    categories: ['eastern'],
    pricing: { first: 9.9, basic: 48, deep: 78, fengshui: 95 },
    originalPricing: { basic: 58, deep: 89, fengshui: 129 },
    timezone: 'Asia/Shanghai',
    avatar: '/masters/master_wu_yang.jpg',
    tagline: '通过八字与环境能量分析，帮助您顺应有利时机行事',
    taglineEn: 'Align your path with the flow of cosmic energy',
    experience: '12年+',
    specialties: ['八字命理', '风水咨询'],
    specialtiesEn: ['BaZi', 'Feng Shui'],
  },
  { 
    id: 'zhang-yihua', 
    name: 'Master Zhang Yihua', 
    nameCn: '张易桦',
    categories: ['eastern'],
    pricing: { first: 9.9, basic: 38, deep: 68 },
    originalPricing: { basic: 48, deep: 79 },
    timezone: 'Asia/Shanghai',
    avatar: '/masters/master_zhang_yihua.jpg',
    tagline: '揭露时空能量学的密码，通过决策学来选择正确的风向',
    taglineEn: 'Revealing the unseen patterns of timing and destiny',
    experience: '8年+',
    specialties: ['奇门遁甲', '六爻占卜'],
    specialtiesEn: ['Qi Men Dun Jia', 'Liu Yao'],
  },
  { 
    id: 'master-luna', 
    name: 'Master Luna', 
    nameCn: '卢娜师傅',
    categories: ['tarot', 'spiritual'],
    pricing: { first: 9.9, basic: 28, deep: 55 },
    originalPricing: { basic: 38, deep: 68 },
    timezone: 'Asia/Shanghai',
    avatar: '/masters/master_luna.jpg',
    tagline: '看见您内心已知的一切，以及前方的道路',
    taglineEn: 'Seeing what your heart already knows, and what lies ahead',
    experience: '8年+',
    specialties: ['塔罗占卜', '灵性探索'],
    specialtiesEn: ['Tarot', 'Spiritual'],
  },
]

// 档位
const TIERS = [
  { id: 'first', nameZh: '首单体验', nameEn: 'First-time', durationZh: '25 分钟', durationEn: '25 min', durationMinutes: 25 },
  { id: 'basic', nameZh: '基础咨询', nameEn: 'Basic', durationZh: '25 分钟', durationEn: '25 min', durationMinutes: 25 },
  { id: 'deep', nameZh: '深度咨询', nameEn: 'Deep', durationZh: '50 分钟', durationEn: '50 min', durationMinutes: 50 },
]

// 时区标签
const TIMEZONE_LABELS: Record<string, { en: string; zh: string }> = {
  'America/Los_Angeles': { en: 'Los Angeles', zh: '洛杉矶' },
  'Asia/Shanghai': { en: 'Beijing', zh: '北京' },
  'Asia/Tokyo': { en: 'Tokyo', zh: '东京' },
  'Asia/Hong_Kong': { en: 'Hong Kong', zh: '香港' },
  'Asia/Singapore': { en: 'Singapore', zh: '新加坡' },
  'America/New_York': { en: 'New York', zh: '纽约' },
  'Europe/London': { en: 'London', zh: '伦敦' },
  'Europe/Paris': { en: 'Paris', zh: '巴黎' },
  'Australia/Sydney': { en: 'Sydney', zh: '悉尼' },
  'UTC': { en: 'UTC', zh: 'UTC' },
}

// 时间段（含30分钟间隔）
const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
]

export default function BookingPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState('')
  const [consultationType, setConsultationType] = useState('')
  const [selectedMaster, setSelectedMaster] = useState('')
  const [selectedTier, setSelectedTier] = useState('')
  const [masterAvailability, setMasterAvailability] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([])
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')
  const [masterStatuses, setMasterStatuses] = useState<Record<string, string>>({})
  const [questionText, setQuestionText] = useState('')
  const [questionImages, setQuestionImages] = useState<string[]>([])
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false)
  const [consultationTopic, setConsultationTopic] = useState('')
  const [supplementaryInfo, setSupplementaryInfo] = useState({
    gender: '',
    birthDateTime: '',
    birthLocation: '',
    currentStatus: '',
  })

  const isZh = i18n.language === 'zh'

  // 查询师傅某天可用时段（与师傅后台同步，带时长参数）
  const fetchMasterAvailability = async (masterId: string, date: Date, durationMinutes?: number) => {
    try {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const dur = durationMinutes || 25
      const res = await fetch(`/api/bookings/occupied-slots?master_id=${masterId}&date=${dateStr}&duration_minutes=${dur}`)
      if (res.ok) {
        const data = await res.json()
        return data.occupiedSlots || []
      }
    } catch (err) {
      console.error('Fetch availability error:', err)
    }
    return []
  }
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        router.push('/auth/login?redirect=/booking')
        return
      }

      setUser(session.user)
      
      // 通过 API 检查是否首单（绕过 RLS）
      const checkRes = await fetch('/api/user/check-first-time', {
        headers: { authorization: `Bearer ${session.access_token || ''}` },
      })
      if (checkRes.ok) {
        const checkData = await checkRes.json()
        setIsFirstTime(checkData.isFirstTime)
      }

      // 获取师傅实时状态（带 no-store 防止浏览器缓存）
      try {
        const mastersRes = await fetch('/api/masters', { cache: 'no-store' })
        if (mastersRes.ok) {
          const mastersData = await mastersRes.json()
          const statusMap: Record<string, string> = {}
          ;(mastersData.masters || []).forEach((m: any) => {
            statusMap[m.id] = m.status || 'online'
          })
          setMasterStatuses(statusMap)
        }
      } catch (err) {
        console.error('Failed to fetch master statuses:', err)
      }
      
      setIsLoading(false)
    }
    checkUser()
  }, [router])

  // 查询已占用时间槽（基于区间重叠，带时长参数）
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedMaster || !selectedDate || consultationType !== 'realtime' || !selectedTier) {
        setBookedSlots([])
        setUnavailableSlots([])
        return
      }
      setCheckingSlots(true)
      try {
        const tierInfo = TIERS.find(t => t.id === selectedTier)
        const durationMinutes = selectedTier === 'fengshui' ? 60 : (tierInfo?.durationMinutes || 25)
        // 使用本地日期，避免 UTC 时区偏差
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        
        // 通过 API 查询已占用时间槽（带时长参数，做区间重叠检测）
        const res = await fetch(`/api/bookings/occupied-slots?master_id=${selectedMaster}&date=${dateStr}&duration_minutes=${durationMinutes}`)
        if (res.ok) {
          const data = await res.json()
          const occupied = data.occupiedSlots || []
          setBookedSlots(occupied)
          setUnavailableSlots(data.unavailableSlots || [])
          if (selectedTime && (occupied.includes(selectedTime) || (data.unavailableSlots || []).includes(selectedTime))) {
            setSelectedTime('')
          }
        } else {
          setBookedSlots([])
          setUnavailableSlots([])
        }
      } catch {
        setBookedSlots([])
        setUnavailableSlots([])
      } finally {
        setCheckingSlots(false)
      }
    }
    fetchBookedSlots()
  }, [selectedMaster, selectedDate, consultationType, selectedTier])

  // 获取当前选中的师傅
  const master = MASTERS.find(m => m.id === selectedMaster)

  // 计算价格
  const getPrice = () => {
    if (!master || !selectedTier) return 0
    if (selectedTier === 'first') return master.pricing.first
    if (selectedTier === 'basic') return master.pricing.basic
    if (selectedTier === 'deep') return master.pricing.deep
    if (selectedTier === 'fengshui') return master.pricing.fengshui
    return 0
  }

  const getDuration = () => {
    if (selectedTier === 'fengshui') return isZh ? '60+ 分钟' : '60+ min'
    const tier = TIERS.find(t => t.id === selectedTier)
    if (!tier) return ''
    return isZh ? tier.durationZh : tier.durationEn
  }

  // 导航
  const handleNext = () => {
    if (step === 2 && isFirstTime) {
      setSelectedTier('first')
    }
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  // 上传问题图片到 Storage
  const handleQuestionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert(isZh ? '请上传图片文件' : 'Please upload an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert(isZh ? '图片大小不能超过5MB' : 'Image size must be less than 5MB')
      return
    }
    setUploadingQuestionImage(true)
    try {
      const supabase = createClient()
      const fileName = `booking-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
      const { data, error } = await supabase.storage
        .from('chat-images')
        .upload(`questions/${fileName}`, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(`questions/${fileName}`)
      setQuestionImages(prev => [...prev, publicUrl])
    } catch (err: any) {
      console.error('Upload error:', err)
      alert(isZh ? `上传失败: ${err.message}` : `Upload failed: ${err.message}`)
    } finally {
      setUploadingQuestionImage(false)
    }
  }

  const removeQuestionImage = (index: number) => {
    setQuestionImages(prev => prev.filter((_, i) => i !== index))
  }

  // 确认预约
  const handleConfirm = async () => {
    if (!user) {
      router.push('/auth/login?redirect=/booking')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      if (!master || !selectedTier) {
        throw new Error('Missing required booking information')
      }

      const finalPrice = getPrice() || 0

      // 发送 booking_start 事件
      track.bookingStart({
        master_name: isZh ? master?.nameCn : master?.name || 'Unknown',
        service_type: `${category}-${selectedTier}`,
        price: finalPrice,
      })

      const durationText = getDuration()
      const tierInfo = TIERS.find(t => t.id === selectedTier)
      const durationMinutes = selectedTier === 'fengshui' ? 60 : (tierInfo?.durationMinutes || 25)
      
      const supabase = createClient()

      // 构建基础 booking 数据
      const bookingData: any = {
        user_id: user.id,
        master_id: selectedMaster,
        service_id: category + '-' + selectedTier,
        service_category: category,
        consultation_type: consultationType,
        tier: selectedTier,
        status: 'pending',
        payment_status: 'pending',
        subtotal: finalPrice,
        discount_amount: 0,
        total_amount: finalPrice,
        currency: 'usd',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        is_first_time: selectedTier === 'first',
        duration_text: durationText,
        duration_minutes: durationMinutes,
      }

      // 实时咨询需要时间和过期检查
      if (consultationType === 'realtime') {
        if (!selectedDate || !selectedTime) {
          throw new Error('Please select date and time for real-time consultation')
        }

        const masterTz = master?.timezone || 'Asia/Shanghai'
        const timeStr = selectedTime.split(':').slice(0, 2).join(':')
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`

        // 时间槽占用检查（通过 API 绕过 RLS，带时长参数做区间重叠检测）
        const checkRes = await fetch(`/api/bookings/check-slot?master_id=${selectedMaster}&date=${dateStr}&time=${selectedTime}&duration_minutes=${durationMinutes}`)
        const checkData = await checkRes.json()

        if (!checkRes.ok) {
          throw new Error(checkData.error || 'Failed to check slot availability')
        }

        if (!checkData.available) {
          throw new Error(isZh ? '该时间段已被预约，请选择其他时间' : 'This time slot is already booked')
        }

        // 获取指定时区在指定日期的偏移（如 +08:00, -07:00）
        // 修复：之前用用户本地时区 toISOString()，导致跨时区预约时间错误
        const getTimezoneOffset = (tz: string, d: Date): string => {
          try {
            const str = d.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
            const match = str.match(/([+-]\d{2}:\d{2})$/)
            return match ? match[1] : '+08:00'
          } catch {
            return '+08:00'
          }
        }

        const offset = getTimezoneOffset(masterTz, selectedDate)
        bookingData.scheduled_at = `${dateStr}T${timeStr}:00${offset}`
        bookingData.scheduled_date = dateStr
        bookingData.scheduled_time = selectedTime
        // 实时咨询：支付期限10分钟
        bookingData.expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }

      // 留言咨询：支付期限10分钟
      if (consultationType === 'message') {
        bookingData.expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()
        // 把咨询方向作为前缀附加到问题文本中
        const topicPrefix = consultationTopic ? `[${CONSULTATION_TOPICS.find(t => t.id === consultationTopic)?.nameZh || consultationTopic}] ` : ''
        // 补充信息
        let supplementary = ''
        if (supplementaryInfo.gender || supplementaryInfo.birthDateTime || supplementaryInfo.birthLocation || supplementaryInfo.currentStatus) {
          supplementary = '\n\n--- 补充信息 ---\n'
          if (supplementaryInfo.gender) {
            const gLabel = { female: '女', male: '男', other: '其他' }[supplementaryInfo.gender] || supplementaryInfo.gender
            supplementary += `性别: ${gLabel}\n`
          }
          if (supplementaryInfo.birthDateTime) supplementary += `出生年月日时: ${supplementaryInfo.birthDateTime}\n`
          if (supplementaryInfo.birthLocation) supplementary += `出生地点: ${supplementaryInfo.birthLocation}\n`
          if (supplementaryInfo.currentStatus) {
            const sLabels: Record<string, string> = { single: '单身', in_relationship: '恋爱中', married: '已婚', divorced: '离婚', breakup: '分手/失恋', complicated: '感情复杂', employed: '在职', unemployed: '待业', startup: '创业', freelancer: '自由职业', student: '学生', retired: '退休' }
            supplementary += `目前状态: ${sLabels[supplementaryInfo.currentStatus] || supplementaryInfo.currentStatus}\n`
          }
        }
        if (questionText.trim()) {
          bookingData.question_text = topicPrefix + questionText.trim() + supplementary
        }
        if (questionImages.length > 0) {
          bookingData.question_images = questionImages
        }
      }

      // 通过 API 创建 booking（绕过 RLS）
      const { data: { session } } = await supabase.auth.getSession()
      const createRes = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify(bookingData),
      })

      if (!createRes.ok) {
        const err = await createRes.json()
        throw new Error(err.error || err.message || 'Failed to create booking')
      }

      // 解析 booking ID
      const createdBooking = await createRes.json().catch(() => null)
      const bookingId = createdBooking?.id || createdBooking?.booking?.id || 'unknown'

      // 发送 booking_created 事件
      track.bookingCreated({
        booking_id: bookingId,
        master_name: isZh ? master?.nameCn : master?.name || 'Unknown',
        service_type: `${category}-${selectedTier}`,
        price: finalPrice,
      })

      // 成功，跳 Dashboard
      router.push('/user/dashboard')

    } catch (err: any) {
      console.error('Booking error:', err)
      setError(err.message || 'An error occurred during booking')
      setIsSubmitting(false)
    }
  }

  // 能否继续
  const canProceed = () => {
    switch (step) {
      case 1: return selectedMaster !== ''
      case 2: return consultationType !== ''
      case 3: return selectedTier !== '' && (consultationType === 'message' || (selectedDate && selectedTime !== ''))
      default: return true
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-stone-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          {isZh ? '加载中...' : 'Loading...'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-stone-600 hover:text-stone-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isZh ? '返回首页' : 'Back to Home'}
          </Link>
          <h1 className="text-3xl font-serif font-bold text-stone-900">
            {isZh ? '预约咨询' : 'Book a Consultation'}
          </h1>
          <p className="text-stone-600 mt-2">
            {isZh ? '选择您信任的师傅，开始您的咨询之旅' : 'Select your preferred advisor to begin your consultation'}
          </p>
          
          {isFirstTime && (
            <div className="mt-4 bg-gradient-to-r from-violet-100 to-purple-100 border border-violet-300 rounded-lg p-4 flex items-center gap-3">
              <Tag className="w-5 h-5 text-violet-600" />
              <div>
                <span className="font-semibold text-violet-800">
                  {isZh ? '🎉 首次用户专享 $9.9 体验价' : '🎉 First-time users: $9.9 special price'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Progress - 3 steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s ? 'bg-violet-600 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-16 sm:w-24 h-1 mx-2 ${step > s ? 'bg-violet-600' : 'bg-stone-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {step === 1 && (isZh ? '选择师傅' : 'Select Master')}
              {step === 2 && (isZh ? '选择咨询方式' : 'Select Consultation Method')}
              {step === 3 && (isZh ? '确认预约' : 'Confirm Booking')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: 选择师傅 */}
            {step === 1 && (
              <div className="space-y-6">
                <p className="text-stone-500 text-sm">
                  {isZh ? '点击卡片选择您信任的师傅，每位师傅都有独特的专业领域' : 'Tap a card to select your preferred advisor'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {MASTERS
                    .filter(m => {
                      const status = masterStatuses[m.id] || 'online'
                      if (status === 'rest') return false
                      return true
                    })
                    .map((m) => {
                      const status = masterStatuses[m.id] || 'online'
                      const statusConfig: Record<string, { label: string; labelEn: string; color: string }> = {
                        online: { label: '在线', labelEn: 'Online', color: 'bg-green-100 text-green-700 border-green-200' },
                        offline: { label: '离线', labelEn: 'Offline', color: 'bg-gray-100 text-gray-600 border-gray-200' },
                        rest: { label: '休息中', labelEn: 'Resting', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                      }
                      const s = statusConfig[status] || statusConfig.online
                      
                      // 从师傅的categories推导分类名称
                      const masterCategories = m.categories.map(catId => {
                        const cat = CATEGORIES.find(c => c.id === catId)
                        return isZh ? cat?.nameZh : cat?.nameEn
                      }).filter(Boolean)
                      
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedMaster(m.id)
                            // 自动设置category为师傅的第一个分类
                            setCategory(m.categories[0] || '')
                            handleNext()
                          }}
                          className={`group cursor-pointer bg-white border-2 rounded-2xl overflow-hidden hover:border-violet-400 hover:shadow-lg transition-all ${
                            selectedMaster === m.id ? 'border-violet-600 ring-2 ring-violet-100' : 'border-stone-200'
                          }`}
                        >
                          {/* 头像区域 */}
                          <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 relative overflow-hidden">
                            <Image
                              src={m.avatar}
                              alt={isZh ? m.nameCn : m.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                            <div className="absolute top-3 right-3">
                              <Badge variant="outline" className={`${s.color} bg-white/90 backdrop-blur-sm`}>
                                {isZh ? s.label : s.labelEn}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* 信息区域 */}
                          <div className="p-5">
                            <h3 className="font-bold text-lg text-stone-900 mb-1">
                              {isZh ? m.nameCn : m.name}
                            </h3>
                            <p className="text-sm text-stone-500 mb-3 line-clamp-2">
                              {isZh ? m.tagline : m.taglineEn}
                            </p>
                            
                            {/* 专长标签 */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {(isZh ? m.specialties : m.specialtiesEn).map((spec, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* 分类标签 */}
                            <div className="flex flex-wrap gap-1 mb-4">
                              {masterCategories.map((catName, i) => (
                                <Badge key={i} variant="outline" className="text-xs text-violet-600 border-violet-200">
                                  {catName}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* 经验和价格 */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-stone-500">
                                {isZh ? `${m.experience}经验` : `${m.experience} exp`}
                              </span>
                              <span className="text-sm">
                                {isFirstTime ? (
                                  <>
                                    <span className="text-stone-400 line-through mr-1">${m.pricing.basic}</span>
                                    <span className="font-semibold text-violet-600">${m.pricing.first}</span>
                                    <span className="text-xs text-red-500 ml-1">{isZh ? '新客专享' : 'First-time Special'}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-stone-400 line-through mr-1">${m.originalPricing?.basic || m.pricing.basic}</span>
                                    <span className="font-semibold text-violet-600">${m.pricing.basic}</span>
                                    <span className="text-xs text-red-500 ml-1">{isZh ? '限时福利价' : 'Limited Offer'}</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
                
                {MASTERS.filter(m => {
                  const status = masterStatuses[m.id] || 'online'
                  if (status === 'rest') return false
                  return true
                }).length === 0 && (
                  <div className="text-center py-12 text-stone-500">
                    <p className="text-lg mb-2">
                      {isZh ? '暂无可用师傅' : 'No masters available'}
                    </p>
                    <p className="text-sm">
                      {isZh ? '请稍后再试' : 'Please check back later'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: 咨询方式 */}
            {step === 2 && (
              <RadioGroup value={consultationType} onValueChange={setConsultationType} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CONSULTATION_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <div key={type.id}>
                      <RadioGroupItem value={type.id} id={type.id} className="peer sr-only" />
                      <Label
                        htmlFor={type.id}
                        className="flex flex-col p-6 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300 h-full"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Icon className="w-6 h-6 text-violet-600" />
                          <h3 className="font-semibold text-lg">{isZh ? type.nameZh : type.nameEn}</h3>
                        </div>
                        <p className="text-stone-600 text-sm">{isZh ? type.descZh : type.descEn}</p>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            )}

            {step === 3 && master && (
              <div className="space-y-6">
                {/* 师傅头部信息 */}
                <div className="flex items-start gap-4 pb-6 border-b border-stone-200">
                  <Image
                    src={master.avatar}
                    alt={isZh ? master.nameCn : master.name}
                    width={80}
                    height={80}
                    className="rounded-xl object-cover"
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-stone-900">{isZh ? master.nameCn : master.name}</h3>
                    <p className="text-sm text-stone-500 mt-1">{isZh ? master.tagline : master.taglineEn}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(isZh ? master.specialties : master.specialtiesEn).map((spec, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{spec}</Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => {setStep(1); setSelectedMaster(''); setSelectedTier(''); setSelectedDate(undefined); setSelectedTime('')}}>
                    {isZh ? '换师傅' : 'Change'}
                  </Button>
                </div>

                {/* 咨询方式（可以切换） */}
                <div>
                  <Label className="block font-semibold mb-3">{isZh ? '咨询方式' : 'Consultation Type'}</Label>
                  <RadioGroup value={consultationType} onValueChange={setConsultationType} className="grid grid-cols-2 gap-3">
                    {CONSULTATION_TYPES.map((type) => {
                      const Icon = type.icon
                      return (
                        <div key={type.id}>
                          <RadioGroupItem value={type.id} id={`detail-${type.id}`} className="peer sr-only" />
                          <Label
                            htmlFor={`detail-${type.id}`}
                            className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300"
                          >
                            <Icon className="w-5 h-5 text-violet-600" />
                            <div>
                              <h4 className="font-medium">{isZh ? type.nameZh : type.nameEn}</h4>
                              <p className="text-xs text-stone-500">{isZh ? type.descZh : type.descEn}</p>
                            </div>
                          </Label>
                        </div>
                      )
                    })}
                  </RadioGroup>
                </div>

                {/* 档位选择 */}
                <div>
                  <Label className="block font-semibold mb-3">{isZh ? '选择服务档位' : 'Select Service Tier'}</Label>
                  <RadioGroup value={selectedTier} onValueChange={setSelectedTier} className="space-y-3">
                    {isFirstTime && (
                      <div>
                        <RadioGroupItem value="first" id="detail-tier-first" className="peer sr-only" />
                        <Label htmlFor="detail-tier-first" className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{isZh ? '首单体验' : 'First-time'}</h4>
                              <Badge className="bg-violet-100 text-violet-700 text-xs">{isZh ? '限首次' : 'First only'}</Badge>
                            </div>
                            <p className="text-sm text-stone-500">{isZh ? '25 分钟 · 适合初次体验' : '25 min · Perfect for first-timers'}</p>
                          </div>
                          <span className="text-xl font-bold text-violet-600">${master.pricing.first}</span>
                        </Label>
                      </div>
                    )}
                    <div>
                      <RadioGroupItem value="basic" id="detail-tier-basic" className="peer sr-only" />
                      <Label htmlFor="detail-tier-basic" className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300">
                        <div className="flex-1">
                          <h4 className="font-semibold">{isZh ? '基础咨询' : 'Basic'}</h4>
                          <p className="text-sm text-stone-500">{isZh ? '25 分钟 · 针对具体问题' : '25 min · For specific questions'}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-400 line-through">${master.originalPricing?.basic || master.pricing.basic}</span>
                            <span className="text-xl font-bold text-violet-600">${isFirstTime ? master.pricing.first : master.pricing.basic}</span>
                          </div>
                          <span className="text-xs text-red-500">{isFirstTime ? (isZh ? '首单体验价' : 'First-time Offer') : (isZh ? '限时福利价' : 'Limited Offer')}</span>
                        </div>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="deep" id="detail-tier-deep" className="peer sr-only" />
                      <Label htmlFor="detail-tier-deep" className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300">
                        <div className="flex-1">
                          <h4 className="font-semibold">{isZh ? '深度咨询' : 'Deep'}</h4>
                          <p className="text-sm text-stone-500">{isZh ? '50 分钟 · 全面深入分析' : '50 min · Comprehensive analysis'}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-400 line-through">${master.originalPricing?.deep || master.pricing.deep}</span>
                            <span className="text-xl font-bold text-violet-600">${isFirstTime ? master.pricing.first : master.pricing.deep}</span>
                          </div>
                          <span className="text-xs text-red-500">{isFirstTime ? (isZh ? '首单体验价' : 'First-time Offer') : (isZh ? '限时福利价' : 'Limited Offer')}</span>
                        </div>
                      </Label>
                    </div>
                    {master.pricing.fengshui && (
                      <div>
                        <RadioGroupItem value="fengshui" id="detail-tier-fengshui" className="peer sr-only" />
                        <Label htmlFor="detail-tier-fengshui" className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{isZh ? '风水专项' : 'Feng Shui'}</h4>
                              <Badge className="bg-amber-100 text-amber-700 text-xs">{isZh ? '戊阳专享' : 'Wu Yang Only'}</Badge>
                            </div>
                            <p className="text-sm text-stone-500">{isZh ? '60+ 分钟 · 含空间分析' : '60+ min · Includes space analysis'}</p>
                          </div>
                          <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-stone-400 line-through">${master.originalPricing?.fengshui || master.pricing.fengshui}</span>
                            <span className="text-xl font-bold text-violet-600">${isFirstTime ? master.pricing.first : master.pricing.fengshui}</span>
                          </div>
                          <span className="text-xs text-red-500">{isFirstTime ? (isZh ? '首单体验价' : 'First-time Offer') : (isZh ? '限时福利价' : 'Limited Offer')}</span>
                        </div>
                        </Label>
                      </div>
                    )}
                  </RadioGroup>
                </div>

                {/* 实时咨询：日期时间选择（与师傅可用时段同步） */}
                {consultationType === 'realtime' && (
                  <div className="space-y-4">
                    <Label className="block font-semibold">{isZh ? '选择预约时间' : 'Select Appointment Time'}</Label>
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="w-fit">
                        <BookingCalendar
                          isZh={isZh}
                          selectedDate={selectedDate}
                          onSelect={setSelectedDate}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{isZh ? '可用时段' : 'Available Slots'}</span>
                          {master && (
                            <span className="text-xs text-stone-400">
                              {isZh ? '师傅时间：' : 'Advisor time: '}{TIMEZONE_LABELS[master.timezone]?.[isZh ? 'zh' : 'en']}
                            </span>
                          )}
                        </div>
                        <div className="border rounded-xl p-4 bg-white">
                          {checkingSlots && (
                            <div className="flex items-center gap-2 text-sm text-stone-400 mb-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {isZh ? '检查可用时间...' : 'Checking availability...'}
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            {(() => {
                              // 2小时缓冲：如果选的是今天，过滤掉当前时间+2小时之前的时段
                              const now = new Date()
                              const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
                              const isToday = selectedDate && (
                                selectedDate.getFullYear() === now.getFullYear() &&
                                selectedDate.getMonth() === now.getMonth() &&
                                selectedDate.getDate() === now.getDate()
                              )
                              
                              const availableSlots = timeSlots.filter((time) => {
                                if (!isToday) return true
                                const [hour, minute] = time.split(':').map(Number)
                                const slotTime = new Date(selectedDate!)
                                slotTime.setHours(hour, minute, 0, 0)
                                return slotTime.getTime() >= minBookingTime.getTime()
                              })
                              
                              if (isToday && availableSlots.length === 0) {
                                return (
                                  <p className="text-sm text-stone-400 text-center col-span-3 py-4">
                                    {isZh ? '今天剩余时段不足2小时，请选择明天或之后' : 'Less than 2 hours remain today. Please select tomorrow or later.'}
                                  </p>
                                )
                              }
                              
                              return availableSlots.map((time) => {
                                const isBooked = bookedSlots.includes(time)
                                const isUnavailable = unavailableSlots.includes(time)
                                const disabled = !selectedDate || isBooked || isUnavailable || checkingSlots
                                return (
                                  <Button
                                    key={time}
                                    variant={selectedTime === time ? 'default' : 'outline'}
                                    onClick={() => !disabled && setSelectedTime(time)}
                                    disabled={disabled}
                                    className={`text-sm ${
                                      selectedTime === time ? 'bg-violet-600' : 
                                      disabled ? 'bg-stone-100 text-stone-400 cursor-not-allowed h-auto py-1.5 flex-col gap-0' : 'h-10'
                                    }`}
                                  >
                                    <span>{time}</span>
                                    {isBooked && <span className="text-[10px] leading-tight">{isZh ? '不可约' : 'Unavailable'}</span>}
                                    {isUnavailable && !isBooked && <span className="text-[10px] leading-tight">{isZh ? '未开放' : 'Closed'}</span>}
                                  </Button>
                                )
                              })
                            })()}
                          </div>
                          {!selectedDate && (
                            <p className="text-sm text-stone-400 mt-2 text-center">{isZh ? '请先选择日期' : 'Please select a date first'}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 留言咨询：问题输入 */}
                {consultationType === 'message' && (
                  <div className="space-y-4">
                    {/* 咨询方向选择 */}
                    <div>
                      <Label className="block font-semibold mb-3">{isZh ? '您想咨询的方向？' : 'What would you like to consult about?'}</Label>
                      <RadioGroup value={consultationTopic} onValueChange={setConsultationTopic} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CONSULTATION_TOPICS.map((topic) => (
                          <div key={topic.id}>
                            <RadioGroupItem value={topic.id} id={`topic-${topic.id}`} className="peer sr-only" />
                            <Label
                              htmlFor={`topic-${topic.id}`}
                              className="flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 peer-data-[state=checked]:text-violet-700 hover:border-violet-300 text-sm font-medium"
                            >
                              {isZh ? topic.nameZh : topic.nameEn}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* 问题描述 */}
                    <div>
                      <Label className="block font-semibold mb-3">{isZh ? '请描述您的问题' : 'Please describe your question'}</Label>
                      <div className="bg-stone-50 p-4 rounded-xl">
                        <textarea
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          placeholder={(() => {
                            const topic = CONSULTATION_TOPICS.find(t => t.id === consultationTopic)
                            if (topic) return isZh ? topic.placeholderZh : topic.placeholderEn
                            return isZh ? '请选择咨询方向后，描述您的具体问题...' : 'Please select a topic and describe your question...'
                          })()}
                          className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[120px] resize-y"
                          maxLength={1000}
                        />
                        <p className="text-xs text-stone-400 mt-1 text-right">{questionText.length}/1000</p>
                      </div>
                    </div>

                    {/* 补充信息（可选） */}
                    <div>
                      <p className="text-sm font-semibold text-violet-700 mb-3">
                        {isZh ? '补充信息（可选，提升解析质量）' : 'Supplementary Info (Optional, improves accuracy)'}
                      </p>
                      <div className="bg-stone-50 p-4 rounded-xl space-y-4">
                          {/* 性别 */}
                          <div>
                            <Label className="block text-sm text-stone-600 mb-2">{isZh ? '性别' : 'Gender'}</Label>
                            <div className="flex gap-4">
                              {[
                                { id: 'female', labelZh: '女', labelEn: 'Female' },
                                { id: 'male', labelZh: '男', labelEn: 'Male' },
                                { id: 'other', labelZh: '其他', labelEn: 'Other' },
                              ].map((g) => (
                                <label key={g.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="gender"
                                    value={g.id}
                                    checked={supplementaryInfo.gender === g.id}
                                    onChange={(e) => setSupplementaryInfo({ ...supplementaryInfo, gender: e.target.value })}
                                    className="text-violet-600"
                                  />
                                  <span className="text-sm">{isZh ? g.labelZh : g.labelEn}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* 出生年月日时 + 地区 */}
                          <div>
                            <Label className="block text-sm text-stone-600 mb-2">{isZh ? '出生年月日时（阳历）及出生地区' : 'Birth Date & Time (Gregorian) + Birth Region'}</Label>
                            <input
                              type="text"
                              value={supplementaryInfo.birthDateTime}
                              onChange={(e) => setSupplementaryInfo({ ...supplementaryInfo, birthDateTime: e.target.value })}
                              placeholder={isZh ? '例如：1995年5月20日 14:30，北京' : 'e.g., May 20, 1995 14:30, Beijing'}
                              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                            <p className="text-xs text-stone-400 mt-1">{isZh ? '八字命理必填，塔罗/灵性咨询可选' : 'Required for BaZi, optional for Tarot/Spiritual'}</p>
                          </div>

                          {/* 出生地点（时区校准） */}
                          <div>
                            <Label className="block text-sm text-stone-600 mb-2">{isZh ? '出生地点（用于时区校准）' : 'Birth Location (for timezone calibration)'}</Label>
                            <input
                              type="text"
                              value={supplementaryInfo.birthLocation}
                              onChange={(e) => setSupplementaryInfo({ ...supplementaryInfo, birthLocation: e.target.value })}
                              placeholder={isZh ? '例如：北京市朝阳区' : 'e.g., Chaoyang District, Beijing'}
                              className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                          </div>

                          {/* 目前状态 */}
                          <div>
                            <Label className="block text-sm text-stone-600 mb-2">{isZh ? '目前状态' : 'Current Status'}</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {[
                                { id: 'single', labelZh: '单身', labelEn: 'Single' },
                                { id: 'in_relationship', labelZh: '恋爱中', labelEn: 'In a Relationship' },
                                { id: 'married', labelZh: '已婚', labelEn: 'Married' },
                                { id: 'divorced', labelZh: '离婚', labelEn: 'Divorced' },
                                { id: 'breakup', labelZh: '分手/失恋', labelEn: 'Break Up' },
                                { id: 'complicated', labelZh: '感情复杂', labelEn: 'Complicated' },
                                { id: 'employed', labelZh: '在职', labelEn: 'Employed' },
                                { id: 'unemployed', labelZh: '待业', labelEn: 'Unemployed' },
                                { id: 'startup', labelZh: '创业', labelEn: 'Entrepreneur' },
                                { id: 'freelancer', labelZh: '自由职业', labelEn: 'Freelancer' },
                                { id: 'student', labelZh: '学生', labelEn: 'Student' },
                                { id: 'retired', labelZh: '退休', labelEn: 'Retired' },
                              ].map((s) => (
                                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="currentStatus"
                                    value={s.id}
                                    checked={supplementaryInfo.currentStatus === s.id}
                                    onChange={(e) => setSupplementaryInfo({ ...supplementaryInfo, currentStatus: e.target.value })}
                                    className="text-violet-600"
                                  />
                                  <span className="text-sm">{isZh ? s.labelZh : s.labelEn}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                    </div>
                  </div>
                )}

                {/* 确认按钮 */}
                <div className="pt-4 border-t border-stone-200">
                  {/* 预约摘要（实时更新） */}
                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-stone-700 mb-3">
                      {isZh ? '预约摘要' : 'Booking Summary'}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-500">{isZh ? '师傅' : 'Advisor'}</span>
                        <span className="font-medium">{isZh ? master?.nameCn : master?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">{isZh ? '服务' : 'Service'}</span>
                        <span className="font-medium">
                          {isZh 
                            ? CATEGORIES.find(c => c.id === category)?.nameZh 
                            : CATEGORIES.find(c => c.id === category)?.nameEn}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">{isZh ? '时长' : 'Duration'}</span>
                        <span className="font-medium">{getDuration()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">{isZh ? '咨询方式' : 'Consultation'}</span>
                        <span className="font-medium">{isZh ? CONSULTATION_TYPES.find(t => t.id === consultationType)?.nameZh : CONSULTATION_TYPES.find(t => t.id === consultationType)?.nameEn}</span>
                      </div>
                      {consultationType === 'realtime' && selectedDate && selectedTime && (
                        <div className="flex justify-between">
                          <span className="text-stone-500">{isZh ? '预约时间' : 'Time'}</span>
                          <span className="font-medium text-right">
                            {selectedDate.getFullYear()}-{String(selectedDate.getMonth() + 1).padStart(2, '0')}-{String(selectedDate.getDate()).padStart(2, '0')} {selectedTime}
                          </span>
                        </div>
                      )}
                      {master && consultationType === 'realtime' && selectedDate && selectedTime && (
                        <div className="flex justify-between">
                          <span className="text-stone-500">{isZh ? '时区' : 'Timezone'}</span>
                          <span className="font-medium text-right text-sm">
                            {isZh ? '师傅时间' : 'Advisor'}：{TIMEZONE_LABELS[master.timezone]?.[isZh ? 'zh' : 'en'] || master.timezone || ''}
                            {(() => {
                              const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
                              const masterTz = master.timezone || 'Asia/Shanghai'
                              if (userTz === masterTz) return null
                              const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                              const timeStr = selectedTime.split(':').slice(0, 2).join(':')
                              const beijingIso = `${dateStr}T${timeStr}:00+08:00`
                              try {
                                const d = new Date(beijingIso)
                                const userLocal = d.toLocaleString(isZh ? 'zh-CN' : 'en-US', {
                                  timeZone: userTz,
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                })
                                const userTzName = TIMEZONE_LABELS[userTz]?.[isZh ? 'zh' : 'en'] || userTz
                                return (
                                  <span className="block text-violet-600 mt-0.5">
                                    {isZh ? '您的时间' : 'Your time'}：{userLocal}（{userTzName}）
                                  </span>
                                )
                              } catch {
                                return null
                              }
                            })()}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-stone-200 pt-2 flex justify-between">
                        <span className="font-medium">{isZh ? '总计' : 'Total'}</span>
                        <span className="font-bold text-violet-600 text-lg">${getPrice()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {error && (
                    <p className="text-sm text-red-600 mb-3">{error}</p>
                  )}

                  {/* 时间确认提示（双时区显示） */}
                  {consultationType === 'realtime' && selectedDate && selectedTime && master && (
                    <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-violet-700 font-medium mb-1">
                        {isZh ? '预约时间确认' : 'Appointment Time Confirmation'}
                      </p>
                      <p className="text-sm text-violet-700">
                        {isZh
                          ? `师傅时间：${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')} ${selectedTime}（${TIMEZONE_LABELS[master.timezone]?.zh || master.timezone || ''}）`
                          : `Advisor time: ${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')} ${selectedTime} (${TIMEZONE_LABELS[master.timezone]?.en || master.timezone || ''})`}
                      </p>
                      {(() => {
                        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
                        const masterTz = master.timezone || 'Asia/Shanghai'
                        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                        const timeStr = selectedTime.split(':').slice(0, 2).join(':')
                        const beijingIso = `${dateStr}T${timeStr}:00+08:00`
                        try {
                          const d = new Date(beijingIso)
                          const userLocal = d.toLocaleString(isZh ? 'zh-CN' : 'en-US', {
                            timeZone: userTz,
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })
                          const userTzName = TIMEZONE_LABELS[userTz]?.[isZh ? 'zh' : 'en'] || userTz
                          if (userTz === masterTz) {
                            return (
                              <p className="text-sm text-violet-700 mt-1">
                                {isZh ? '您的时间与师傅一致' : 'Your time matches advisor time'}
                              </p>
                            )
                          }
                          return (
                            <p className="text-sm text-violet-700 mt-1">
                              {isZh ? `您的时间：${userLocal}（${userTzName}）` : `Your time: ${userLocal} (${userTzName})`}
                            </p>
                          )
                        } catch {
                          return null
                        }
                      })()}
                      <p className="text-xs text-violet-600 mt-1">
                        {isZh
                          ? '请确认这是您希望咨询的时间，跨时区预约请核对双方时间。'
                          : 'Please confirm this is your desired time. Cross-timezone appointments: verify both times.'}
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleConfirm}
                    disabled={isSubmitting || !selectedTier || (consultationType === 'realtime' && (!selectedDate || !selectedTime))}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isZh ? '处理中...' : 'Processing...'}
                      </>
                    ) : (
                      isZh ? '确认预约' : 'Confirm Booking'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 1 || isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isZh ? '上一步' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="bg-violet-600 hover:bg-violet-700">
              {isZh ? '下一步' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={() => setStep(1)} 
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isZh ? '返回第一步' : 'Restart'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
