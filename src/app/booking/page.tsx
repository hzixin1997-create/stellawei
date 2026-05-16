'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Clock, Sparkles, Compass, Sun, Video, MessageSquare, Loader2, Tag } from 'lucide-react'
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

// 师傅
const MASTERS = [
  { 
    id: 'master-luna', 
    name: 'Master Luna', 
    nameCn: '卢娜师傅',
    categories: ['tarot', 'spiritual'],
    pricing: { first: 9.9, basic: 28, deep: 55 },
    timezone: 'America/Los_Angeles',
  },
  { 
    id: 'zhang-yihua', 
    name: 'Master Zhang Yihua', 
    nameCn: '张易桦',
    categories: ['eastern'],
    pricing: { first: 9.9, basic: 38, deep: 68 },
    timezone: 'Asia/Shanghai',
  },
  { 
    id: 'wu-yang', 
    name: 'Master Wu Yang', 
    nameCn: '戊阳',
    categories: ['eastern'],
    pricing: { first: 9.9, basic: 48, deep: 78, fengshui: 95 },
    timezone: 'Asia/Shanghai',
  },
]

// 档位
const TIERS = [
  { id: 'first', nameZh: '首单体验', nameEn: 'First-time', durationZh: '20-30 分钟', durationEn: '20-30 min', durationMinutes: 25 },
  { id: 'basic', nameZh: '基础咨询', nameEn: 'Basic', durationZh: '20-30 分钟', durationEn: '20-30 min', durationMinutes: 25 },
  { id: 'deep', nameZh: '深度咨询', nameEn: 'Deep', durationZh: '40-60 分钟', durationEn: '40-60 min', durationMinutes: 50 },
]

// 时区标签
const TIMEZONE_LABELS: Record<string, { en: string; zh: string }> = {
  'America/Los_Angeles': { en: 'Pacific Time (PT)', zh: '太平洋时间 (PT)' },
  'Asia/Shanghai': { en: 'China Standard Time (CST)', zh: '北京时间 (CST)' },
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
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTime, setSelectedTime] = useState('')
  const [bookedSlots, setBookedSlots] = useState<string[]>([])
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [isFirstTime, setIsFirstTime] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')

  const isZh = i18n.language === 'zh'

  // 检测用户是否首次
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
      
      setIsLoading(false)
    }
    checkUser()
  }, [router])

  // 查询已占用时间槽
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedMaster || !selectedDate || consultationType !== 'realtime') {
        setBookedSlots([])
        return
      }
      setCheckingSlots(true)
      try {
        const dateStr = selectedDate.toISOString().split('T')[0]
        
        // 通过 API 查询已占用时间槽（绕过 RLS）
        const res = await fetch(`/api/bookings/occupied-slots?master_id=${selectedMaster}&date=${dateStr}`)
        if (res.ok) {
          const data = await res.json()
          const occupied = data.occupiedSlots || []
          setBookedSlots(occupied)
          if (selectedTime && occupied.includes(selectedTime)) {
            setSelectedTime('')
          }
        } else {
          setBookedSlots([])
        }
      } catch {
        setBookedSlots([])
      } finally {
        setCheckingSlots(false)
      }
    }
    fetchBookedSlots()
  }, [selectedMaster, selectedDate, consultationType])

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

        const dateStr = selectedDate.toISOString().split('T')[0]
        
        // 时间槽占用检查（通过 API 绕过 RLS）
        const checkRes = await fetch(`/api/bookings/check-slot?master_id=${selectedMaster}&date=${dateStr}&time=${selectedTime}`)
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
        bookingData.expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      }

      // 留言咨询不需要时间
      if (consultationType === 'message') {
        bookingData.expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天
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
      case 4: return selectedTier !== ''
      case 5: return consultationType === 'message' || (selectedDate && selectedTime !== '')
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
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s ? 'bg-violet-600 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {s}
              </div>
              {s < 5 && (
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
              {step === 4 && (isZh ? '选择服务档位' : 'Select Service Tier')}
              {step === 5 && (isZh ? '确认预约' : 'Confirm Booking')}
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

            {/* Step 3: 师傅 */}
            {step === 3 && (
              <RadioGroup value={selectedMaster} onValueChange={setSelectedMaster} className="space-y-4">
                {MASTERS
                  .filter(m => m.categories.includes(category))
                  .map((m) => (
                  <div key={m.id}>
                    <RadioGroupItem value={m.id} id={m.id} className="peer sr-only" />
                    <Label
                      htmlFor={m.id}
                      className="flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mr-4">
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{isZh ? m.nameCn : m.name}</h3>
                        <p className="text-stone-600 text-sm">
                          {isZh 
                            ? `${m.categories.map(c => CATEGORIES.find(cat => cat.id === c)?.nameZh).join(' / ')}` 
                            : `${m.categories.map(c => CATEGORIES.find(cat => cat.id === c)?.nameEn).join(' / ')}`
                          }
                        </p>
                        <div className="flex gap-2 mt-2">
                          {m.categories.map(c => (
                            <Badge key={c} variant="outline" className="text-xs">
                              {isZh ? CATEGORIES.find(cat => cat.id === c)?.nameZh : CATEGORIES.find(cat => cat.id === c)?.nameEn}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-stone-500">
                          {isZh ? '基础' : 'Basic'} ${m.pricing.basic}
                        </div>
                        <div className="text-sm text-stone-500">
                          {isZh ? '深度' : 'Deep'} ${m.pricing.deep}
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Step 4: 档位 */}
            {step === 4 && master && (
              <RadioGroup value={selectedTier} onValueChange={setSelectedTier} className="space-y-4">
                {/* 首单体验（仅首次用户） */}
                {isFirstTime && (
                  <div>
                    <RadioGroupItem value="first" id="tier-first" className="peer sr-only" />
                    <Label
                      htmlFor="tier-first"
                      className="flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {isZh ? '首单体验' : 'First-time Experience'}
                          </h3>
                          <Badge className="bg-violet-100 text-violet-700">{isZh ? '限首次' : 'First only'}</Badge>
                        </div>
                        <p className="text-stone-600 text-sm mt-1">
                          {isZh ? '20-30 分钟 · 适合初次体验' : '20-30 min · Perfect for first-timers'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-violet-600">${master.pricing.first}</span>
                      </div>
                    </Label>
                  </div>
                )}

                {/* 基础 */}
                <div>
                  <RadioGroupItem value="basic" id="tier-basic" className="peer sr-only" />
                  <Label
                    htmlFor="tier-basic"
                    className="flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{isZh ? '基础咨询' : 'Basic Consultation'}</h3>
                      <p className="text-stone-600 text-sm mt-1">
                        {isZh ? '20-30 分钟 · 针对具体问题' : '20-30 min · For specific questions'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-violet-600">${master.pricing.basic}</span>
                    </div>
                  </Label>
                </div>

                {/* 深度 */}
                <div>
                  <RadioGroupItem value="deep" id="tier-deep" className="peer sr-only" />
                  <Label
                    htmlFor="tier-deep"
                    className="flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{isZh ? '深度咨询' : 'Deep Consultation'}</h3>
                      <p className="text-stone-600 text-sm mt-1">
                        {isZh ? '40-60 分钟 · 全面深入分析' : '40-60 min · Comprehensive analysis'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-violet-600">${master.pricing.deep}</span>
                    </div>
                  </Label>
                </div>

                {/* 风水专项（仅戊阳） */}
                {master.id === 'wu-yang' && master.pricing.fengshui && (
                  <div>
                    <RadioGroupItem value="fengshui" id="tier-fengshui" className="peer sr-only" />
                    <Label
                      htmlFor="tier-fengshui"
                      className="flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{isZh ? '风水专项' : 'Feng Shui Special'}</h3>
                          <Badge className="bg-amber-100 text-amber-700">{isZh ? '戊阳专享' : 'Wu Yang Only'}</Badge>
                        </div>
                        <p className="text-stone-600 text-sm mt-1">
                          {isZh ? '60+ 分钟 · 含空间 walkthrough' : '60+ min · Includes space walkthrough'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-violet-600">${master.pricing.fengshui}</span>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            )}

            {/* Step 5: 确认 + 时间选择 */}
            {step === 5 && (
              <div className="space-y-6">
                {/* 实时咨询：选时间 */}
                {consultationType === 'realtime' && (
                  <div className="flex flex-col lg:flex-row gap-8 items-start">
                    <div className="w-fit">
                      <Label className="mb-3 block font-semibold">{isZh ? '选择日期' : 'Select Date'}</Label>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(0, 0, 0, 0)
                          const d = new Date(date)
                          d.setHours(0, 0, 0, 0)
                          return d.getTime() < today.getTime() || date.getDay() === 0
                        }}
                        className="rounded-md border"
                      />
                    </div>
                    
                    <div className="lg:w-[320px] flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="font-semibold">{isZh ? '选择时间' : 'Select Time'}</Label>
                        {master && (
                          <span className="text-xs text-stone-400">
                            {TIMEZONE_LABELS[master.timezone]?.[isZh ? 'zh' : 'en']}
                          </span>
                        )}
                      </div>
                      <div className="border rounded-xl p-4 bg-white max-h-[420px] flex flex-col">
                        {checkingSlots && (
                          <div className="flex items-center gap-2 text-sm text-stone-400 mb-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {isZh ? '检查可用时间...' : 'Checking availability...'}
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1">
                          {timeSlots.map((time) => {
                            const isBooked = bookedSlots.includes(time)
                            const isPast = (() => {
                              if (!selectedDate) return false
                              const now = new Date()
                              const isToday = selectedDate.toDateString() === now.toDateString()
                              if (!isToday) return false
                              const [h, m] = time.split(':').map(Number)
                              const slot = new Date(now)
                              slot.setHours(h, m, 0, 0)
                              return slot.getTime() <= now.getTime()
                            })()
                            return (
                              <Button
                                key={time}
                                variant={selectedTime === time ? 'default' : 'outline'}
                                onClick={() => !isBooked && !isPast && setSelectedTime(time)}
                                disabled={!selectedDate || isBooked || isPast || checkingSlots}
                                className={`h-10 text-sm ${
                                  selectedTime === time ? 'bg-violet-600' : 
                                  isBooked || isPast ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : ''
                                }`}
                              >
                                {time}
                                {isBooked && <span className="ml-1 text-[10px]">{isZh ? '已约' : 'Booked'}</span>}
                              </Button>
                            )
                          })}
                        </div>
                        {!selectedDate && (
                          <p className="text-sm text-stone-400 mt-3 text-center">{isZh ? '请先选择日期' : 'Please select a date first'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 留言咨询：不需要时间 */}
                {consultationType === 'message' && (
                  <div className="bg-stone-50 p-4 rounded-xl">
                    <p className="text-stone-600">{isZh ? '留言咨询无需预约时间，下单后您可以在用户后台提交问题，师傅会在24小时内回复。' : 'Message consultation does not require scheduling. After booking, submit your questions in the dashboard, and the master will reply within 24 hours.'}</p>
                  </div>
                )}

                {/* 订单摘要 */}
                <div className="bg-stone-50 p-5 rounded-xl max-w-md mx-auto">
                  <h3 className="font-semibold mb-4 text-center">{isZh ? '预约详情' : 'Booking Summary'}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '咨询类型' : 'Type'}</span>
                      <span>{isZh ? CATEGORIES.find(c => c.id === category)?.nameZh : CATEGORIES.find(c => c.id === category)?.nameEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '咨询方式' : 'Method'}</span>
                      <span>{isZh ? CONSULTATION_TYPES.find(t => t.id === consultationType)?.nameZh : CONSULTATION_TYPES.find(t => t.id === consultationType)?.nameEn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '师傅' : 'Master'}</span>
                      <span>{isZh ? master?.nameCn : master?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '档位' : 'Tier'}</span>
                      <span>{isZh ? TIERS.find(t => t.id === selectedTier)?.nameZh : TIERS.find(t => t.id === selectedTier)?.nameEn}</span>
                    </div>
                    {consultationType === 'realtime' && selectedDate && selectedTime && (
                      <div className="flex justify-between">
                        <span className="text-stone-600">{isZh ? '时间' : 'Time'}</span>
                        <span>{selectedDate.toLocaleDateString()} {selectedTime}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '时长' : 'Duration'}</span>
                      <span>{getDuration()}</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                      <span>{isZh ? '总计' : 'Total'}</span>
                      <span className="text-violet-600">${getPrice()}</span>
                    </div>
                  </div>
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
          {step < 5 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="bg-violet-600 hover:bg-violet-700">
              {isZh ? '下一步' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              onClick={handleConfirm} 
              disabled={isSubmitting || !canProceed()}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isZh ? '处理中...' : 'Processing...'}
                </>
              ) : (
                <>{isZh ? '确认预约' : 'Confirm Booking'}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
