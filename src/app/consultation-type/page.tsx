'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ArrowLeft, MessageSquare, Video, Clock, User, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

// 咨询方式
const consultationTypes = [
  {
    id: 'realtime',
    icon: Video,
    titleKey: 'realtime_title',
    titleZh: '实时咨询（预约制）',
    descKey: 'realtime_desc',
    descZh: '与师傅进行在线聊天实时对话，即时解答您的问题',
    duration: '沟通时间 30 min',
  },
  {
    id: 'message',
    icon: MessageSquare,
    titleKey: 'message_title',
    titleZh: '留言咨询（48小时文字回复）',
    descKey: 'message_desc',
    descZh: '详细描述您的问题，师傅会在48小时内给出文字回复和解答',
    duration: '48h',
  },
]

export default function ConsultationTypePage() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [selectedType, setSelectedType] = useState('')
  const isZh = i18n.language === 'zh'

  const handleProceed = () => {
    if (selectedType === 'realtime') {
      router.push('/booking')
    } else if (selectedType === 'message') {
      router.push('/consultation')
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
            {isZh ? '选择咨询方式' : 'Choose Consultation Type'}
          </h1>
          <p className="text-stone-600 mt-2">
            {isZh ? '我们提供两种咨询方式，请选择适合您的' : 'We offer two consultation types. Please choose the one that suits you.'}
          </p>
        </div>

        {/* Options */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {isZh ? '咨询方式' : 'Consultation Type'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedType} onValueChange={setSelectedType} className="space-y-4">
              {consultationTypes.map((type) => (
                <div key={type.id}>
                  <RadioGroupItem value={type.id} id={type.id} className="peer sr-only" />
                  <Label
                    htmlFor={type.id}
                    className="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-violet-600 peer-data-[state=checked]:bg-violet-50 hover:border-violet-300"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white mr-4">
                      <type.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{isZh ? type.titleZh : type.titleKey}</h3>
                      <p className="text-stone-600">{isZh ? type.descZh : type.descKey}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {type.duration}
                        </span>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isZh ? '返回' : 'Back'}
            </Button>
          </Link>
          <Button onClick={handleProceed} disabled={!selectedType} className="bg-violet-600 hover:bg-violet-700">
            {isZh ? '下一步' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
