'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Clock, User, Sparkles } from 'lucide-react'
import Link from 'next/link'

// 师傅数据
const masters = [
  { id: 'master-luna', name: 'Master Luna', nameCn: '卢娜师傅', specialty: 'Tarot', price: '$25' },
  { id: 'zhang-yihua', name: 'Master Zhang Yihua', nameCn: '张易桦', specialty: 'Qi Men Dun Jia', price: '$35' },
  { id: 'wu-yang', name: 'Master Wu Yang', nameCn: '戊阳', specialty: 'BaZi & Feng Shui', price: '$45' },
]

// 服务数据
const services = [
  { id: 'tarot', name: 'Tarot Reading', nameCn: '塔罗占卜', duration: '20 min', price: '$25', description: 'Get guidance through tarot cards' },
  { id: 'bazi', name: 'BaZi Analysis', nameCn: '八字分析', duration: '40 min', price: '$45', description: 'Understand your destiny through Chinese astrology' },
  { id: 'spiritual', name: 'Spiritual Guidance', nameCn: '灵性指引', duration: '30 min', price: '$35', description: 'Connect with your inner wisdom' },
]

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

  const isZh = i18n.language === 'zh'

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleConfirm = () => {
    // TODO: 提交预约到 Supabase
    alert('Booking confirmed! (Demo)')
    router.push('/dashboard')
  }

  const canProceed = () => {
    switch (step) {
      case 1: return selectedMaster !== ''
      case 2: return selectedService !== ''
      case 3: return selectedDate && selectedTime !== ''
      default: return true
    }
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
            {isZh ? '选择师傅、服务和时间，开启您的命理之旅' : 'Choose your master, service, and time to begin your journey'}
          </p>
        </div>

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
                      <div className="text-violet-600 font-bold">{master.price}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Step 2: Select Service */}
            {step === 2 && (
              <RadioGroup value={selectedService} onValueChange={setSelectedService} className="space-y-4">
                {services.map((service) => (
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
                          <span>{service.duration}</span>
                        </div>
                      </div>
                      <div className="text-violet-600 font-bold text-lg">{service.price}</div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Step 3: Select Date & Time */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="mb-3 block">{isZh ? '选择日期' : 'Select Date'}</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    className="rounded-md border"
                  />
                </div>
                {selectedDate && (
                  <div>
                    <Label className="mb-3 block">{isZh ? '选择时间' : 'Select Time'}</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {timeSlots.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? 'default' : 'outline'}
                          onClick={() => setSelectedTime(time)}
                          className={selectedTime === time ? 'bg-violet-600' : ''}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
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
                        {services.find(s => s.id === selectedService)?.[isZh ? 'nameCn' : 'name']}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '日期' : 'Date'}</span>
                      <span className="font-medium">{selectedDate?.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '时间' : 'Time'}</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>{isZh ? '总计' : 'Total'}</span>
                        <span className="text-violet-600">
                          {services.find(s => s.id === selectedService)?.price}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-stone-500 text-center">
                  {isZh ? '点击确认后将跳转到支付页面' : 'Click confirm to proceed to payment'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 1}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isZh ? '上一步' : 'Back'}
          </Button>
          {step < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed()} className="bg-violet-600 hover:bg-violet-700">
              {isZh ? '下一步' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleConfirm} className="bg-violet-600 hover:bg-violet-700">
              {isZh ? '确认预约' : 'Confirm Booking'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
