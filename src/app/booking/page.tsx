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
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Clock, User, Sparkles, Tag, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// 师傅数据
const masters = [
  { id: 'master-luna', name: 'Master Luna', nameCn: '卢娜师傅', specialty: 'Tarot', price: 25, timezone: 'America/Los_Angeles' },
  { id: 'zhang-yihua', name: 'Master Zhang Yihua', nameCn: '张易桦', specialty: 'Qi Men Dun Jia', price: 35, timezone: 'Asia/Shanghai' },
  { id: 'wu-yang', name: 'Master Wu Yang', nameCn: '戊阳', specialty: 'BaZi & Feng Shui', price: 45, timezone: 'Asia/Shanghai' },
]

// 时区显示标签
const TIMEZONE_LABELS: Record<string, { en: string; zh: string }> = {
  'America/Los_Angeles': { en: 'Pacific Time (PT)', zh: '太平洋时间 (PT)' },
  'Asia/Shanghai': { en: 'China Standard Time (CST)', zh: '北京时间 (CST)' },
}

// 服务数据（原价）
const servicesOriginal = [
  { id: 'tarot', name: 'Tarot Reading', nameCn: '塔罗占卜', duration: 20, price: 25, description: 'Get guidance through tarot cards' },
  { id: 'spiritual', name: 'Spiritual Guidance', nameCn: '灵性指引', duration: 30, price: 35, description: 'Connect with your inner wisdom' },
  { id: 'qimen', name: 'Qi Men Dun Jia', nameCn: '奇门遁甲', duration: 40, price: 55, description: 'Strategic timing and decision making analysis' },
  { id: 'liuyao', name: 'Liu Yao Divination', nameCn: '六爻占卜', duration: 30, price: 45, description: 'Hexagram divination for specific questions' },
  { id: 'bazi', name: 'BaZi Analysis', nameCn: '八字分析', duration: 40, price: 45, description: 'Understand your destiny through Chinese astrology' },
  { id: 'fengshui', name: 'Feng Shui Consultation', nameCn: '风水咨询', duration: 50, price: 60, description: 'Optimize your living and working space energy' },
]

// 师傅支持的服务映射
const MASTER_SERVICES: Record<string, string[]> = {
  'master-luna': ['tarot', 'spiritual'],
  'zhang-yihua': ['qimen', 'liuyao', 'bazi'],
  'wu-yang': ['bazi', 'fengshui'],
}

// 首次用户优惠价格
const FIRST_TIME_PRICE = 9.9

// 时间段
const timeSlots = [
  '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '19:00', '20:00'
]

export default function BookingPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedMaster, setSelectedMaster] = useState('')
  const [selectedService, setSelectedService] = useState('')
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

  // 检测用户是否是首次用户并获取用户信息
  useEffect(() => {
    const checkUserAndFirstTime = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        // 未登录用户重定向到登录页
        router.push('/auth/login?redirect=/booking')
        return
      }

      setUser(session.user)
      
      // 查询用户是否有过已支付的历史预约（已完成的订单才算非首单）
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('payment_status', 'paid')
        .limit(1)
      
      if (!error && bookings && bookings.length > 0) {
        setIsFirstTime(false)
      }
      
      setIsLoading(false)
    }

    checkUserAndFirstTime()
  }, [router])

  // 查询已占用的时间槽
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedMaster || !selectedDate) {
        setBookedSlots([])
        return
      }
      setCheckingSlots(true)
      try {
        const supabase = createClient()
        const dateStr = selectedDate.toISOString().split('T')[0]
        const { data, error } = await supabase
          .from('bookings')
          .select('scheduled_time')
          .eq('master_id', selectedMaster)
          .eq('scheduled_date', dateStr)
          .in('payment_status', ['paid', 'pending'])
        
        if (!error && data) {
          const occupied = data.map((b: any) => b.scheduled_time)
          setBookedSlots(occupied)
          // 如果当前选中的时间在新日期已被占用，清空选择
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
  }, [selectedMaster, selectedDate])

  // 获取显示价格（首次用户显示折扣价）
  const getDisplayPrice = (originalPrice: number) => {
    return isFirstTime ? FIRST_TIME_PRICE : originalPrice
  }

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleConfirm = async () => {
    if (!user) {
      router.push('/auth/login?redirect=/booking')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const master = masters.find(m => m.id === selectedMaster)
      const service = servicesOriginal.find(s => s.id === selectedService)
      
      if (!master || !service || !selectedDate || !selectedTime) {
        throw new Error('Missing required booking information')
      }

      // 计算最终价格
      const finalPrice = isFirstTime ? FIRST_TIME_PRICE : service.price

      // 构建预约时间字符串
      const scheduledDateTime = new Date(selectedDate)
      const [hours, minutes] = selectedTime.split(':')
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes))

      const supabase = createClient()

      // 🔒 最终时间槽占用检查（防止并发冲突）
      const dateStr = selectedDate.toISOString().split('T')[0]
      const { data: existingBookings, error: checkError } = await supabase
        .from('bookings')
        .select('id')
        .eq('master_id', selectedMaster)
        .eq('scheduled_date', dateStr)
        .eq('scheduled_time', selectedTime)
        .in('payment_status', ['paid', 'pending'])
        .limit(1)

      if (checkError) {
        throw new Error('Failed to check slot availability')
      }

      if (existingBookings && existingBookings.length > 0) {
        throw new Error(
          isZh
            ? '该时间段已被预约，请选择其他时间'
            : 'This time slot is already booked. Please select another time.'
        )
      }

      // 1. 创建 booking 记录
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          master_id: selectedMaster,
          service_id: selectedService,
          scheduled_at: scheduledDateTime.toISOString(),
          scheduled_date: selectedDate.toISOString().split('T')[0],
          scheduled_time: selectedTime,
          duration_minutes: service.duration,
          status: 'pending',
          payment_status: 'pending',
          subtotal: service.price,
          discount_amount: isFirstTime ? service.price - FIRST_TIME_PRICE : 0,
          total_amount: finalPrice,
          currency: 'usd',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          is_first_time: isFirstTime,
        })
        .select()
        .single()

      if (bookingError) {
        throw new Error(`Failed to create booking: ${bookingError.message}`)
      }

      // 2. 调用手动支付 API（过渡方案：创建 booking + 通知管理员）
      const response = await fetch('/api/payment/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.email,
          masterName: isZh ? master.nameCn : master.name,
          serviceName: isZh ? service.nameCn : service.name,
          scheduledDate: selectedDate.toLocaleDateString(),
          scheduledTime: selectedTime,
          amount: finalPrice,
          currency: 'usd',
          isFirstTime,
        }),
      })

      const paymentData = await response.json()

      if (!response.ok) {
        throw new Error(paymentData.error || 'Failed to process booking')
      }

      // 3. 跳转到预约成功/待支付页面
      router.push(`/booking/success?booking_id=${booking.id}`)

    } catch (err: any) {
      console.error('Booking error:', err)
      setError(err.message || 'An error occurred during booking')
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return selectedMaster !== ''
      case 2: return selectedService !== ''
      case 3: return selectedDate && selectedTime !== ''
      default: return true
    }
  }

  // 获取当前选中的服务价格
  const selectedServiceData = servicesOriginal.find(s => s.id === selectedService)
  const selectedServicePrice = selectedServiceData?.price || 0
  const finalPrice = getDisplayPrice(selectedServicePrice)

  // 加载中状态
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
            {isZh ? '实时咨询预约' : 'Real-time Consultation Booking'}
          </h1>
          <p className="text-stone-600 mt-2">
            {isZh ? '选择师傅并预约时间，进行30分钟在线聊天实时对话' : 'Select a master and schedule a 30-minute real-time chat consultation'}
          </p>
          
          {/* 首次用户优惠提示 */}
          {isFirstTime && !isLoading && (
            <div className="mt-4 bg-gradient-to-r from-violet-100 to-purple-100 border border-violet-300 rounded-lg p-4 flex items-center gap-3">
              <Tag className="w-5 h-5 text-violet-600" />
              <div>
                <span className="font-semibold text-violet-800">
                  {isZh ? '🎉 首次用户专享优惠！' : '🎉 First-time user special offer!'}
                </span>
                <span className="text-violet-700 ml-2">
                  {isZh ? '任意服务仅需 $9.9' : 'Any service for just $9.9'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= s ? 'bg-violet-600 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {s}
              </div>
              {s < 4 && (
                <div className={`w-16 sm:w-24 h-1 mx-2 ${
                  step > s ? 'bg-violet-600' : 'bg-stone-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <><User className="w-5 h-5" /> {isZh ? '选择师傅' : 'Select Master'}</>}
              {step === 2 && <><Sparkles className="w-5 h-5" /> {isZh ? '选择服务' : 'Select Service'}</>}
              {step === 3 && <><CalendarIcon className="w-5 h-5" /> {isZh ? '选择时间' : 'Select Date & Time'}</>}
              {step === 4 && <><Clock className="w-5 h-5" /> {isZh ? '确认预约' : 'Confirm Booking'}</>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Step 1: Select Master */}
            {step === 1 && (
              <RadioGroup value={selectedMaster} onValueChange={setSelectedMaster} className="space-y-4">
                {masters.map((master) => (
                  <div key={master.id}>
                    <RadioGroupItem value={master.id} id={master.id} className="peer sr-only" />
                    <Label
                      htmlFor={master.id}
                      className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mr-4">
                        {master.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{isZh ? master.nameCn : master.name}</h3>
                        <p className="text-stone-600">{master.specialty}</p>
                      </div>
                      <div className="text-right">
                        {isFirstTime ? (
                          <div className="flex flex-col items-end">
                            <span className="text-stone-400 line-through text-sm">${master.price}</span>
                            <span className="text-violet-600 font-bold">${FIRST_TIME_PRICE}</span>
                          </div>
                        ) : (
                          <div className="text-violet-600 font-bold">${master.price}</div>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Step 2: Select Service */}
            {step === 2 && (
              <RadioGroup value={selectedService} onValueChange={setSelectedService} className="space-y-4">
                {servicesOriginal
                  .filter((service) => MASTER_SERVICES[selectedMaster]?.includes(service.id))
                  .map((service) => (
                  <div key={service.id}>
                    <RadioGroupItem value={service.id} id={service.id} className="peer sr-only" />
                    <Label
                      htmlFor={service.id}
                      className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{isZh ? service.nameCn : service.name}</h3>
                        <p className="text-stone-600">{isZh ? '通过命理获得指引' : service.description}</p>
                        <div className="flex gap-4 mt-2 text-sm text-stone-500">
                          <span>{service.duration} min</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {isFirstTime ? (
                          <div className="flex flex-col items-end">
                            <span className="text-stone-400 line-through text-sm">${service.price}</span>
                            <span className="text-violet-600 font-bold text-lg">${FIRST_TIME_PRICE}</span>
                            <Badge className="mt-1 bg-violet-100 text-violet-700 text-xs">{isZh ? '首单优惠' : 'First Order'}</Badge>
                          </div>
                        ) : (
                          <div className="text-violet-600 font-bold text-lg">${service.price}</div>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Step 3: Select Date & Time */}
            {step === 3 && (
              <div>
                {/* 左右并排布局：日历 + 时间 */}
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* 左侧：日历 */}
                  <div className="w-fit">
                    <Label className="mb-3 block">{isZh ? '选择日期' : 'Select Date'}</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => {
                        // 修复：按日期级别比较，忽略时分秒
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const d = new Date(date)
                        d.setHours(0, 0, 0, 0)
                        return d.getTime() < today.getTime() || date.getDay() === 0
                      }}
                      className="rounded-md border"
                    />
                  </div>
                  
                  {/* 右侧：时间选择 */}
                  <div className="lg:w-[240px] flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <Label>{isZh ? '选择时间' : 'Select Time'}</Label>
                      {selectedMaster && (
                        <span className="text-xs text-stone-400">
                          {TIMEZONE_LABELS[masters.find(m => m.id === selectedMaster)?.timezone || '']?.[isZh ? 'zh' : 'en']}
                        </span>
                      )}
                    </div>
                    {checkingSlots && (
                      <div className="flex items-center gap-2 text-sm text-stone-400 mb-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isZh ? '检查可用时间...' : 'Checking availability...'}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {timeSlots.map((time) => {
                        const isBooked = bookedSlots.includes(time)
                        // 判断时间槽是否已经过去（仅今天）
                        const isPast = (() => {
                          if (!selectedDate) return false
                          const now = new Date()
                          const isToday = selectedDate.toDateString() === now.toDateString()
                          if (!isToday) return false
                          const [hours, minutes] = time.split(':').map(Number)
                          const slotTime = new Date(now)
                          slotTime.setHours(hours, minutes, 0, 0)
                          return slotTime.getTime() <= now.getTime()
                        })()
                        return (
                          <Button
                            key={time}
                            variant={selectedTime === time ? 'default' : 'outline'}
                            onClick={() => !isBooked && !isPast && setSelectedTime(time)}
                            disabled={!selectedDate || isBooked || isPast || checkingSlots}
                            className={`h-11 ${
                              selectedTime === time
                                ? 'bg-violet-600'
                                : isBooked || isPast
                                ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                                : selectedDate
                                ? ''
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {time}
                            {isBooked && (
                              <span className="ml-1 text-[10px]">{isZh ? '已约' : 'Booked'}</span>
                            )}
                            {isPast && !isBooked && (
                              <span className="ml-1 text-[10px]">{isZh ? '已结束' : 'Ended'}</span>
                            )}
                          </Button>
                        )
                      })}
                    </div>
                    {!selectedDate && (
                      <p className="text-sm text-stone-400 mt-3 text-center">
                        {isZh ? '请先选择日期' : 'Please select a date first'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-stone-50 p-4 rounded-xl">
                  <h3 className="font-semibold mb-4">{isZh ? '预约详情' : 'Booking Details'}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '师傅' : 'Master'}</span>
                      <span className="font-medium">
                        {masters.find(m => m.id === selectedMaster)?.[isZh ? 'nameCn' : 'name']}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '服务' : 'Service'}</span>
                      <span className="font-medium">
                        {servicesOriginal.find(s => s.id === selectedService)?.[isZh ? 'nameCn' : 'name']}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '日期' : 'Date'}</span>
                      <span className="font-medium">{selectedDate?.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '时间' : 'Time'}</span>
                      <span className="font-medium">
                        {selectedTime}
                        {selectedMaster && (
                          <span className="text-xs text-stone-400 ml-1">
                            ({TIMEZONE_LABELS[masters.find(m => m.id === selectedMaster)?.timezone || '']?.[isZh ? 'zh' : 'en']})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>{isZh ? '总计' : 'Total'}</span>
                        <div className="text-right">
                          {isFirstTime && (
                            <span className="text-stone-400 line-through text-sm mr-2">
                              ${selectedServicePrice}
                            </span>
                          )}
                          <span className="text-violet-600">
                            ${finalPrice}
                          </span>
                        </div>
                      </div>
                      {isFirstTime && (
                        <p className="text-xs text-violet-600 mt-1 text-right">
                          {isZh ? '✨ 已应用首次用户优惠' : '✨ First-time user discount applied'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-stone-500 text-center">
                  {isZh ? '点击确认后将创建预约，您可以在下一页选择支付方式完成付款' : 'Click confirm to create your booking. You will be able to choose a payment method on the next page.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
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
              onClick={handleConfirm} 
              disabled={isSubmitting}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isZh ? '处理中...' : 'Processing...'}
                </>
              ) : (
                <>
                  {isZh ? '确认预约' : 'Confirm Booking'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
