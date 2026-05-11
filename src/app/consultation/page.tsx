'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, User, MessageSquare, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// 师傅数据
const masters = [
  { id: 'zhang-yihua', name: 'Master Zhang Yihua', nameCn: '张易桦', specialty: 'Qi Men Dun Jia', originalPrice: 49.9 },
  { id: 'wu-yang', name: 'Master Wu Yang', nameCn: '戊阳', specialty: 'BaZi & Feng Shui', originalPrice: 39.9 },
  { id: 'master-luna', name: 'Master Luna', nameCn: '卢娜师傅', specialty: 'Tarot', originalPrice: 39.9 },
]

const FIRST_TIME_PRICE = 9.9

export default function ConsultationPage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedMaster, setSelectedMaster] = useState('')
  const [question, setQuestion] = useState('')
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isZh = i18n.language === 'zh'

  // 检测用户登录状态
  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        router.push('/auth/login?redirect=/consultation')
        return
      }
      setUser(session.user)
      setIsLoading(false)
    }
    checkUser()
  }, [router])

  const handleNext = () => {
    if (step < 3) setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleConfirm = async () => {
    if (!user) {
      router.push('/auth/login?redirect=/consultation')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const master = masters.find(m => m.id === selectedMaster)
      if (!master) throw new Error('No master selected')

      // 调用 create-order API（留言咨询）
      const response = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_id: selectedMaster,
          consultation_type: 'message',
          user_email: user.email,
          user_question: question,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order')
      }

      // 跳转到 Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        router.push(`/payment/success?order_id=${data.order_id}`)
      }

    } catch (err: any) {
      console.error('Consultation error:', err)
      setError(err.message || 'An error occurred')
      setIsSubmitting(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1: return selectedMaster !== ''
      case 2: return question.trim().length >= 10
      default: return true
    }
  }

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
          <Link href="/consultation-type" className="inline-flex items-center text-stone-600 hover:text-stone-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isZh ? '返回' : 'Back'}
          </Link>
          <h1 className="text-3xl font-serif font-bold text-stone-900">
            {isZh ? '留言咨询' : 'Message Consultation'}
          </h1>
          <p className="text-stone-600 mt-2">
            {isZh ? '选择师傅、描述问题，48小时内获得文字回复和解答' : 'Choose a master, describe your question, receive a written reply and solution within 48 hours'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step >= s ? 'bg-violet-600 text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-24 sm:w-32 h-1 mx-2 ${
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
              {step === 2 && <><MessageSquare className="w-5 h-5" /> {isZh ? '描述问题' : 'Describe Your Question'}</>}
              {step === 3 && <><Check className="w-5 h-5" /> {isZh ? '确认付款' : 'Confirm & Pay'}</>}
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
                        <div className="flex flex-col items-end">
                          <span className="text-stone-400 line-through text-sm">${master.originalPrice}</span>
                          <span className="text-violet-600 font-bold">${FIRST_TIME_PRICE}</span>
                          <span className="text-xs text-amber-600 mt-1">🎉 {isZh ? '首次体验价' : 'First-time price'}</span>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Step 2: Describe Question */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="question" className="mb-2 block">
                    {isZh ? '请详细描述您想咨询的问题' : 'Please describe your question in detail'}
                  </Label>
                  <textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={isZh ? '请详细描述您想咨询的问题...' : 'Please describe what you would like to consult about...'}
                    className="w-full min-h-[200px] resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <p className="text-sm text-stone-500 mt-2">
                    {isZh ? `已输入 ${question.length} 字，建议至少10个字` : `${question.length} characters entered, minimum 10 recommended`}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    {isZh 
                      ? '💡 提示：请尽量详细描述您的背景信息和具体问题，这样师傅能给出更精准的分析。例如：您的出生年月日、目前遇到的问题、想了解的方面等。'
                      : '💡 Tip: Please provide detailed background information and specific questions so the master can give a more accurate analysis.'
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Confirm & Pay */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-stone-50 p-4 rounded-xl">
                  <h3 className="font-semibold mb-4">{isZh ? '订单详情' : 'Order Details'}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '师傅' : 'Master'}</span>
                      <span className="font-medium">
                        {masters.find(m => m.id === selectedMaster)?.[isZh ? 'nameCn' : 'name']}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">{isZh ? '咨询方式' : 'Consultation Type'}</span>
                      <span className="font-medium">{isZh ? '留言咨询（48小时文字回复和解答）' : 'Message Consultation (48h reply & solution)'}</span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>{isZh ? '总计' : 'Total'}</span>
                        <div className="text-right">
                          <span className="text-violet-600">$9.9</span>
                          <span className="text-sm text-stone-400 line-through ml-2">${masters.find(m => m.id === selectedMaster)?.originalPrice}</span>
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 mt-1">
                        {isZh ? '🎉 首次体验价' : '🎉 First-time special price'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    {isZh 
                      ? '🔒 您的提问内容仅师傅可见，我们承诺严格保密。付款后师傅将在48小时内给出详细回复和解答。'
                      : '🔒 Your question is visible only to the master. We guarantee strict confidentiality. The master will reply within 48 hours after payment.'
                    }
                  </p>
                </div>
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
          {step < 3 ? (
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
                  {isZh ? '确认并付款' : 'Confirm & Pay'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
