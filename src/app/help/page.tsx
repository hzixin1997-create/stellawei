'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, HelpCircle, Calendar, CreditCard, MessageCircle, RotateCcw, User, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'

export default function HelpCenterPage() {
  const { i18n } = useTranslation()
  const isZh = i18n.language === 'zh'

  const faqs = [
    {
      icon: Calendar,
      question: isZh ? '如何预约咨询？' : 'How do I book a consultation?',
      answer: isZh
        ? '在首页选择您感兴趣的咨询类型（塔罗、八字、奇门遁甲等），浏览师傅卡片后点击进入详情页，选择合适的档位与日期时段，完成支付即可确认预约。预约成功后，您可以在用户后台查看订单状态。'
        : 'Select your preferred consultation type (Tarot, Bazi, Qimen Dunjia, etc.) on the homepage, browse practitioner cards, click into a profile, choose a tier and time slot, then complete payment to confirm. After booking, you can view order status in your user dashboard.',
    },
    {
      icon: CreditCard,
      question: isZh ? '支持哪些支付方式？' : 'What payment methods are accepted?',
      answer: isZh
        ? '我们目前支持信用卡（通过 Stripe）和支付宝两种支付方式。所有支付由 Stripe 安全处理，平台不存储您的完整银行卡信息。'
        : 'We currently support credit card (via Stripe) and Alipay. All payments are securely processed by Stripe; we do not store your full card details.',
    },
    {
      icon: MessageCircle,
      question: isZh ? '咨询在哪里进行？' : 'Where does the consultation take place?',
      answer: isZh
        ? '目前支持实时文字聊天咨询。在预约时间开始前，您会收到邮件提醒。进入用户后台，点击对应订单即可进入聊天界面与师傅实时沟通。'
        : 'We currently offer real-time text chat consultations. You will receive an email reminder before your scheduled time. Enter your user dashboard, click the corresponding order, and you will enter the chat interface to communicate with your practitioner in real time.',
    },
    {
      icon: RotateCcw,
      question: isZh ? '如何申请退款？' : 'How do I request a refund?',
      answer: isZh
        ? '如果您的订单符合退款条件（如咨询开始前 24 小时以上取消），请前往用户后台，在对应订单上点击「申请退款」，阅读并同意退款政策后提交申请。管理员将在 1-2 个工作日内审核处理。'
        : 'If your order qualifies for a refund (e.g., cancellation more than 24 hours before the scheduled consultation), go to your user dashboard, click "Request Refund" on the corresponding order, read and agree to the refund policy, then submit. Our admin team will review within 1-2 business days.',
    },
    {
      icon: User,
      question: isZh ? '我可以修改个人信息吗？' : 'Can I update my personal information?',
      answer: isZh
        ? '可以。在用户后台的「个人资料」页面，您可以修改昵称等基本信息。如需更改注册邮箱或删除账户，请联系客服 support@stellawei.org。'
        : 'Yes. In your user dashboard under "Profile," you can update basic information such as your nickname. To change your registered email or delete your account, please contact support@stellawei.org.',
    },
    {
      icon: Mail,
      question: isZh ? '如何联系客服？' : 'How do I contact customer support?',
      answer: isZh
        ? '请发送邮件至 support@stellawei.org，我们的团队通常会在 1-2 个工作日内回复。如遇到紧急技术问题，请在邮件标题中注明「紧急」。'
        : 'Please email support@stellawei.org. Our team typically responds within 1-2 business days. For urgent technical issues, please include "Urgent" in the subject line.',
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center text-stone-600 hover:text-stone-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isZh ? '返回首页' : 'Back to Home'}
        </Link>

        <Card>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mb-4">
              <HelpCircle className="w-8 h-8 text-violet-600" />
            </div>
            <CardTitle className="text-2xl font-serif">
              {isZh ? '帮助中心' : 'Help Center'}
            </CardTitle>
            <p className="text-sm text-stone-500 mt-2">
              {isZh ? '常见问题与使用指南' : 'Frequently Asked Questions & Guides'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="flex gap-3">
                <faq.icon className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{faq.question}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            ))}

            <div className="bg-stone-50 p-4 rounded-lg text-sm text-stone-600">
              {isZh
                ? '没有找到您需要的答案？请发送邮件至 support@stellawei.org，我们很乐意为您提供帮助。'
                : "Can't find the answer you need? Email us at support@stellawei.org — we're happy to help."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
