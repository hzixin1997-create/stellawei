'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, zhCN, enUS } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Clock, Sparkles, Compass, Sun, Video, MessageSquare, Loader2, Tag, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ===== 数据结构 =====

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
    id: 'master-luna', 
    name: 'Master Luna', 
    nameCn: '卢娜师傅',
    categories: ['tarot', 'spiritual'],
    pricing: { first: 9.9, basic: 28, deep: 55 },
    timezone: 'Asia/Shanghai',
    avatar: '/masters/master_luna.jpg',
    tagline: '看见您内心已知的一切，以及前方的道路',
    taglineEn: 'Seeing what your heart already knows, and what lies ahead',
    experience: '10年+',
    specialties: ['塔罗占卜', '灵性探索'],
    specialtiesEn: ['Tarot', 'Spiritual'],
  },
  { 
    id: 'zhang-yihua', 
    name: 'Master Zhang Yihua', 
    nameCn: '张易桦',
    categories: ['eastern'],
    pricing: { first: 9.9, basic: 38, deep: 68 },
    timezone: 'Asia/Shanghai',
    avatar: '/masters/master_zhang_yihua.jpg',
    tagline: '揭露时空能量学的密码，通过决策学来选择正确的风向',
    taglineEn: 'Revealing the unseen patterns of timing and destiny',
    experience: '8年',
    specialties: ['奇门遁甲', '六爻占卜'],
    specialtiesEn: ['Qi Men Dun Jia', 'Liu Yao'],
  },
  { 
    id: 'wu-yang', 
    name: 'Master Wu Yang', 
    nameCn: '戊阳',
    categories: ['eastern'],
    pricing: { first: 9.9, basic: 48, deep: 78, fengshui: 95 },
    timezone: 'Asia/Shanghai',
    avatar: '/masters/master_wu_yang.jpg',
    tagline: '通过八字与环境能量分析，帮助您顺应有利时机行事',
    taglineEn: 'Align your path with the flow of cosmic energy',
    experience: '12年+',
    specialties: ['八字命理', '风水咨询'],
    specialtiesEn: ['BaZi', 'Feng Shui'],
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
  '19:00', '19:30', '20:00', '20:30'
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
        const durationMinutes = tierInfo?.durationMinutes || 25
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
    return 0
  }

  const getDuration = () => {
    const tier = TIERS.find(t => t.id === selectedTier)
    if (!tier) return ''
    return isZh ? tier.durationZh : tier.durationEn
  }

  // 导航
  const handleNext = () => {
    if (step < 5) setStep(step + 1)
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

      const finalPrice = getPrice()
      const durationText = getDuration()
      const tierInfo = TIERS.find(t => t.id === selectedTier)
      const durationMinutes = tierInfo?.durationMinutes || 25
      
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

        const scheduledDateTime = new Date(selectedDate)
        const [hours, minutes] = selectedTime.split(':')
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes))

        // 使用本地日期，避免 toISOString() 返回 UTC 日期导致时区偏差（UTC+8 可能前一天）
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

        bookingData.scheduled_at = scheduledDateTime.toISOString()
        bookingData.scheduled_date = dateStr
        bookingData.scheduled_time = selectedTime
        // 实时咨询：支付期限10分钟
        bookingData.expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }

      // 留言咨询：支付期限10分钟
      if (consultationType === 'message') {
        bookingData.expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()
        if (questionText.trim()) {
          bookingData.question_text = questionText.trim()
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
      case 1: return category !== ''
      case 2: return consultationType !== ''
      case 3: return selectedMaster !== ''
      case 4: return selectedTier !== '' && (consultationType === 'message' || (selectedDate && selectedTime !== ''))
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
            {isZh ? '选择您感兴趣的咨询类型和师傅' : 'Select the type of consultation and master you prefer'}
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

        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s ? 'bg-violet-600 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {s}
              </div>
              {s < 4 && (
                <div className={`w-8 sm:w-12 h-1 mx-1 ${step > s ? 'bg-violet-600' : 'bg-stone-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {step === 1 && (isZh ? '选择咨询类型' : 'Select Consultation Type')}
              {step === 2 && (isZh ? '选择咨询方式' : 'Select Consultation Method')}
              {step === 3 && (isZh ? '选择师傅' : 'Select Master')}
              {step === 4 && (isZh ? '确认预约' : 'Confirm Booking')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: 大类 */}
            {step === 1 && (
              <RadioGroup value={category} onValueChange={setCategory} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  return (
                    <div key={cat.id}>
                      <RadioGroupItem value={cat.id} id={cat.id} className="peer sr-only" />
                      <Label
                        htmlFor={cat.id}
                        className="flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300 h-full"
                      >
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center text-white mb-3`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <h3 className="font-semibold text-lg">{isZh ? cat.nameZh : cat.nameEn}</h3>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
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

            {step === 3 && (
              <div className="space-y-6">
                {/* 已选条件显示 */}
                <div className="flex items-center gap-2 text-sm text-stone-500 mb-4">
                  <Badge variant="outline">
                    {isZh ? CATEGORIES.find(c => c.id === category)?.nameZh : CATEGORIES.find(c => c.id === category)?.nameEn}
                  </Badge>
                  <span>·</span>
                  <Badge variant="outline">
                    {isZh ? CONSULTATION_TYPES.find(t => t.id === consultationType)?.nameZh : CONSULTATION_TYPES.find(t => t.id === consultationType)?.nameEn}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {MASTERS
                    .filter(m => {
                      if (!m.categories.includes(category)) return false
                      const status = masterStatuses[m.id] || 'online'
                      if (status === 'rest') return false
                      if (consultationType === 'realtime' && status !== 'online') return false
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
                      
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedMaster(m.id)
                            setStep(4)
                          }}
                          className="group cursor-pointer bg-white border-2 border-stone-200 rounded-2xl overflow-hidden hover:border-violet-400 hover:shadow-lg transition-all"
                        >
                          {/* 头像区域 */}
                          <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 relative overflow-hidden">
                            <img
                              src={m.avatar}
                              alt={isZh ? m.nameCn : m.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {(isZh ? m.specialties : m.specialtiesEn).map((spec, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                            
                            {/* 经验和价格 */}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-stone-500">
                                {isZh ? `${m.experience}经验` : `${m.experience} exp`}
                              </span>
                              <span className="font-semibold text-violet-600">
                                ${m.pricing.basic} {isZh ? '起' : 'up'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
                
                {MASTERS.filter(m => {
                  if (!m.categories.includes(category)) return false
                  const status = masterStatuses[m.id] || 'online'
                  if (status === 'rest') return false
                  if (consultationType === 'realtime' && status !== 'online') return false
                  return true
                }).length === 0 && (
                  <div className="text-center py-12 text-stone-500">
                    <p className="text-lg mb-2">
                      {isZh ? '暂无可用师傅' : 'No masters available'}
                    </p>
                    <p className="text-sm">
                      {isZh ? '请尝试其他咨询方式或稍后再试' : 'Please try another consultation type or check back later'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {step === 4 && master && (
              <div className="space-y-6">
                {/* 师傅头部信息 */}
                <div className="flex items-start gap-4 pb-6 border-b border-stone-200">
                  <img
                    src={master.avatar}
                    alt={isZh ? master.nameCn : master.name}
                    className="w-20 h-20 rounded-xl object-cover"
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
                  <Button variant="outline" size="sm" onClick={() => {setStep(3); setSelectedMaster(''); setSelectedTier(''); setSelectedDate(undefined); setSelectedTime('')}}>
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
                        <span className="text-xl font-bold text-violet-600">${master.pricing.basic}</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="deep" id="detail-tier-deep" className="peer sr-only" />
                      <Label htmlFor="detail-tier-deep" className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300">
                        <div className="flex-1">
                          <h4 className="font-semibold">{isZh ? '深度咨询' : 'Deep'}</h4>
                          <p className="text-sm text-stone-500">{isZh ? '50 分钟 · 全面深入分析' : '50 min · Comprehensive analysis'}</p>
                        </div>
                        <span className="text-xl font-bold text-violet-600">${master.pricing.deep}</span>
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
                          <span className="text-xl font-bold text-violet-600">${master.pricing.fengshui}</span>
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
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          locale={isZh ? zhCN : enUS}
                          disabled={(date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            const d = new Date(date)
                            d.setHours(0, 0, 0, 0)
                            return d.getTime() < today.getTime()
                          }}
                          className="rounded-md border"
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
                    <Label className="block font-semibold">{isZh ? '您的问题' : 'Your Question'}</Label>
                    <div className="bg-stone-50 p-4 rounded-xl">
                      <p className="text-stone-600 text-sm mb-3">
                        {isZh ? '请描述您想咨询的问题，师傅会在24小时内回复。' : 'Please describe your question. The master will reply within 24 hours.'}
                      </p>
                      <textarea
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder={isZh ? '例如：我最近在工作上遇到了瓶颈，想问问关于职业发展的建议...' : 'e.g., I have been facing a bottleneck at work...'}
                        className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[120px] resize-y"
                        maxLength={1000}
                      />
                      <p className="text-xs text-stone-400 mt-1 text-right">{questionText.length}/1000</p>
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
          {step < 4 ? (
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
