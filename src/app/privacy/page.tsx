'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Shield, Eye, Database, Share2, Cookie, Trash2, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'

export default function PrivacyPolicyPage() {
  const { i18n } = useTranslation()
  const isZh = i18n.language === 'zh'

  const sections = [
    {
      icon: Eye,
      title: isZh ? '我们收集的信息' : 'Information We Collect',
      content: isZh
        ? '当您使用 Stellawei 平台时，我们可能会收集以下信息：账户信息（邮箱地址、姓名）、支付信息（由 Stripe 安全处理，我们不存储完整的银行卡信息）、预约与咨询记录、实时聊天消息、以及浏览器类型、IP 地址等设备与使用数据。'
        : 'When you use the Stellawei platform, we may collect: account information (email, name), payment information (securely processed by Stripe—we do not store full card details), booking and consultation records, real-time chat messages, and device/usage data such as browser type and IP address.',
    },
    {
      icon: Database,
      title: isZh ? '信息的使用方式' : 'How We Use Your Information',
      content: isZh
        ? '我们使用您的信息来：提供并维护平台服务、处理支付与退款、匹配您与合适的命理师傅、发送预约提醒与通知、改进用户体验与平台功能，以及遵守法律法规要求。'
        : 'We use your information to: provide and maintain platform services, process payments and refunds, match you with suitable masters, send booking reminders and notifications, improve user experience and platform features, and comply with legal requirements.',
    },
    {
      icon: Share2,
      title: isZh ? '第三方服务提供商' : 'Third-Party Service Providers',
      content: isZh
        ? '为实现平台功能，我们与以下可信第三方共享必要数据：Stripe（支付处理）、Supabase（数据库存储与身份验证）、Vercel（网站托管）。这些服务商均遵循行业标准的安全与隐私保护措施。'
        : 'To enable platform functionality, we share necessary data with trusted third parties: Stripe (payment processing), Supabase (database storage and authentication), and Vercel (website hosting). These providers adhere to industry-standard security and privacy practices.',
    },
    {
      icon: Cookie,
      title: isZh ? 'Cookie 与追踪技术' : 'Cookies & Tracking Technologies',
      content: isZh
        ? '我们使用 Cookie 和类似技术来保持您的登录状态、记住语言偏好，并分析网站流量以优化性能。您可以在浏览器设置中管理或禁用 Cookie，但部分功能可能因此受限。'
        : 'We use cookies and similar technologies to maintain your login session, remember language preferences, and analyze site traffic for performance optimization. You can manage or disable cookies in your browser settings, though some features may be limited.',
    },
    {
      icon: Trash2,
      title: isZh ? '您的权利与数据删除' : 'Your Rights & Data Deletion',
      content: isZh
        ? '您有权访问、更正或删除您的个人数据。如需删除账户及所有关联数据，请发送邮件至 support@stellawei.org，我们将在 30 天内完成处理。请注意，根据法律要求，部分交易记录可能需要保留更长时间。'
        : 'You have the right to access, correct, or delete your personal data. To delete your account and all associated data, email support@stellawei.org and we will process your request within 30 days. Please note that some transaction records may need to be retained longer for legal compliance.',
    },
    {
      icon: Mail,
      title: isZh ? '联系我们' : 'Contact Us',
      content: isZh
        ? '如果您对本隐私政策有任何疑问，请通过 support@stellawei.org 联系我们的团队。'
        : 'If you have any questions about this Privacy Policy, please contact our team at support@stellawei.org.',
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
              <Shield className="w-8 h-8 text-violet-600" />
            </div>
            <CardTitle className="text-2xl font-serif">
              {isZh ? '隐私政策' : 'Privacy Policy'}
            </CardTitle>
            <p className="text-sm text-stone-500 mt-2">
              {isZh ? '最后更新：2026年5月' : 'Last Updated: May 2026'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-sm text-stone-600 leading-relaxed">
              {isZh
                ? 'Stellawei（"我们"、"平台"）重视您的隐私。本政策说明我们如何收集、使用、存储和保护您的个人信息。使用本平台即表示您同意本隐私政策的条款。'
                : 'Stellawei ("we", "the platform") values your privacy. This policy explains how we collect, use, store, and protect your personal information. By using the platform, you agree to the terms of this Privacy Policy.'}
            </p>

            {sections.map((section, idx) => (
              <div key={idx} className="flex gap-3">
                <section.icon className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">{section.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{section.content}</p>
                </div>
              </div>
            ))}

            <div className="bg-stone-50 p-4 rounded-lg text-sm text-stone-600">
              {isZh
                ? '我们保留随时更新本隐私政策的权利。重大变更将通过邮件或平台公告通知您。'
                : 'We reserve the right to update this Privacy Policy at any time. Significant changes will be communicated via email or platform announcements.'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
