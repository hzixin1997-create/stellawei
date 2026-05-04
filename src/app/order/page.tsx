'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Mail, MessageSquare, Video, ChevronRight, Loader2 } from 'lucide-react'

const MASTERS = [
  {
    slug: 'zhang-yihua',
    name: '张易桦师傅',
    nameEn: 'Master Zhang Yihua',
    specialty: '奇门遁甲 · 六爻占卜',
    avatar: '/masters/master_zhang_yihua.jpg',
    experience: '8年',
  },
  {
    slug: 'wu-yang',
    name: '戊阳师傅',
    nameEn: 'Master Wu Yang',
    specialty: '八字命理 · 风水咨询',
    avatar: '/masters/master_wu_yang.jpg',
    experience: '12年',
  },
]

const SERVICE_TYPES = [
  {
    key: 'message',
    label: '留言咨询',
    labelEn: 'Message Consultation',
    desc: '提交您的问题，师傅将在48小时内通过文字回复',
    price: '$29.9',
    icon: MessageSquare,
  },
  {
    key: 'realtime',
    label: '实时咨询',
    labelEn: 'Live Consultation',
    desc: '预约时间与师傅进行一对一视频/语音咨询',
    price: '$59.9',
    icon: Video,
  },
]

export default function OrderPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!selectedMaster || !selectedService || !email) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          master_id: selectedMaster,
          service_type: selectedService,
          user_email: email,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '创建订单失败')
        setLoading(false)
        return
      }

      // 跳转到 Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        setError('未获取到支付链接')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || '网络错误')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-serif font-bold text-stone-900">Stellawei</span>
          </Link>
          <div className="text-sm text-stone-500">预约咨询</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= s
                    ? 'bg-amber-700 text-white'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 transition-colors ${
                    step > s ? 'bg-amber-700' : 'bg-stone-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: 选师傅 */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 text-center mb-2">
              选择您的命理师傅
            </h1>
            <p className="text-stone-500 text-center mb-8">
              两位资深师傅，为您提供专业的命理咨询服务
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {MASTERS.map((master) => (
                <button
                  key={master.slug}
                  onClick={() => {
                    setSelectedMaster(master.slug)
                    setStep(2)
                  }}
                  className={`text-left p-6 rounded-2xl border transition-all hover:shadow-md ${
                    selectedMaster === master.slug
                      ? 'border-amber-700 bg-amber-50 ring-2 ring-amber-700'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-stone-200 flex-shrink-0 overflow-hidden">
                      {master.avatar ? (
                        <img
                          src={master.avatar}
                          alt={master.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-stone-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-900">{master.name}</h3>
                      <p className="text-sm text-stone-500">{master.nameEn}</p>
                      <p className="text-sm text-amber-700 mt-1">{master.specialty}</p>
                      <p className="text-xs text-stone-400 mt-1">
                        {master.experience}专业经验
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-stone-400 flex-shrink-0 mt-2" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: 选服务类型 */}
        {step === 2 && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="text-sm text-stone-500 hover:text-stone-700 mb-4"
            >
              ← 重新选择师傅
            </button>

            <h1 className="text-2xl font-serif font-bold text-stone-900 text-center mb-2">
              选择咨询方式
            </h1>
            <p className="text-stone-500 text-center mb-8">
              {MASTERS.find((m) => m.slug === selectedMaster)?.name} 为您服务
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {SERVICE_TYPES.map((service) => {
                const Icon = service.icon
                return (
                  <button
                    key={service.key}
                    onClick={() => {
                      setSelectedService(service.key)
                      setStep(3)
                    }}
                    className={`text-left p-6 rounded-2xl border transition-all hover:shadow-md ${
                      selectedService === service.key
                        ? 'border-amber-700 bg-amber-50 ring-2 ring-amber-700'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-stone-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-stone-900">{service.label}</h3>
                          <span className="text-lg font-bold text-amber-700">
                            {service.price}
                          </span>
                        </div>
                        <p className="text-sm text-stone-500">{service.labelEn}</p>
                        <p className="text-sm text-stone-600 mt-2">{service.desc}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: 填邮箱 + 提交 */}
        {step === 3 && (
          <div>
            <button
              onClick={() => setStep(2)}
              className="text-sm text-stone-500 hover:text-stone-700 mb-4"
            >
              ← 重新选择服务
            </button>

            <h1 className="text-2xl font-serif font-bold text-stone-900 text-center mb-2">
              确认订单
            </h1>

            <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-stone-100">
                <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-stone-600" />
                </div>
                <div>
                  <p className="font-medium text-stone-900">
                    {MASTERS.find((m) => m.slug === selectedMaster)?.name}
                  </p>
                  <p className="text-sm text-stone-500">
                    {
                      SERVICE_TYPES.find((s) => s.key === selectedService)
                        ?.label
                    }
                  </p>
                </div>
                <div className="ml-auto text-xl font-bold text-amber-700">
                  {SERVICE_TYPES.find((s) => s.key === selectedService)?.price}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    您的邮箱地址
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 outline-none transition-colors"
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    订单确认和师傅回复将通过邮件发送给您
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !email}
              className="w-full py-4 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在创建订单...
                </>
              ) : (
                <>
                  前往支付
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>

            <p className="text-xs text-stone-400 text-center mt-4">
              支付由 Stripe 安全处理 · 支持信用卡/借记卡
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
