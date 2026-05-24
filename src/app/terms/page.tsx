'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FileText, Scale, AlertTriangle, CreditCard, Lock, Globe, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'

export default function TermsOfServicePage() {
  const { i18n } = useTranslation()
  const isZh = i18n.language === 'zh'

  const sections = [
    {
      icon: FileText,
      title: isZh ? '服务描述' : 'Service Description',
      content: isZh
        ? 'Stellawei 是一个连接用户与命理、塔罗、风水等咨询师的在线预约与实时咨询平台。我们提供技术基础设施，撮合预约、处理支付、并提供实时聊天工具。所有咨询内容由入驻师傅独立提供，平台不对具体解读内容的准确性或效果承担责任。'
        : 'Stellawei is an online booking and real-time consultation platform connecting users with practitioners of fortune-telling, tarot, feng shui, and related disciplines. We provide the technical infrastructure for scheduling, payment processing, and real-time chat. All consultation content is independently provided by the practitioners; the platform is not responsible for the accuracy or outcomes of specific readings.',
    },
    {
      icon: Scale,
      title: isZh ? '用户义务' : 'User Obligations',
      content: isZh
        ? '您同意：提供真实准确的注册信息；尊重咨询师，不使用侮辱、骚扰或不当言论；不得利用本平台进行违法活动、欺诈或传播有害信息；不得试图绕过平台支付系统；对自己的账户安全负责，妥善保管登录凭据。'
        : 'You agree to: provide true and accurate registration information; treat practitioners with respect, without using insulting, harassing, or inappropriate language; not use the platform for illegal activities, fraud, or spreading harmful content; not attempt to bypass the platform payment system; and be responsible for your account security and login credentials.',
    },
    {
      icon: CreditCard,
      title: isZh ? '支付与退款' : 'Payments & Refunds',
      content: isZh
        ? '所有支付通过 Stripe 安全处理。预约确认后款项将暂时冻结，待咨询完成后结算给师傅。退款政策详见我们的退款政策页面。用户须自行承担因汇率波动或银行手续费产生的差额。'
        : 'All payments are securely processed through Stripe. After booking confirmation, funds are temporarily held and settled to the practitioner upon completion of the consultation. For refund rules, please see our Refund Policy page. Users are responsible for any differences caused by currency exchange fluctuations or bank fees.',
    },
    {
      icon: AlertTriangle,
      title: isZh ? '重要免责声明' : 'Important Disclaimer',
      content: isZh
        ? '本平台提供的所有命理、塔罗、风水、占星等咨询服务仅供娱乐和个人参考之用，不构成医疗、心理、法律、财务或其他专业建议。如您面临健康、心理、法律或重大财务决策问题，请务必咨询对应领域的持证专业人士。平台及入驻师傅不对您基于咨询内容所作的任何决定或行动承担责任。'
        : 'All fortune-telling, tarot, feng shui, astrology, and related consultation services provided through this platform are for entertainment and personal reference purposes only. They do not constitute medical, psychological, legal, financial, or other professional advice. If you are facing health, mental health, legal, or major financial decisions, please consult a licensed professional in the relevant field. Neither the platform nor the practitioners are liable for any decisions or actions you take based on the consultation content.',
    },
    {
      icon: Lock,
      title: isZh ? '知识产权' : 'Intellectual Property',
      content: isZh
        ? '平台网站、品牌标识、界面设计及相关软件代码的知识产权归 Stellawei 所有。用户在咨询过程中获得的解读内容仅供个人使用，未经师傅书面同意不得用于商业用途或公开传播。'
        : 'The platform website, brand identity, interface design, and related software code are the intellectual property of Stellawei. Interpretation content obtained by users during consultations is for personal use only and may not be used for commercial purposes or publicly distributed without the practitioner\'s written consent.',
    },
    {
      icon: Globe,
      title: isZh ? '责任限制与适用法律' : 'Limitation of Liability & Governing Law',
      content: isZh
        ? '在法律允许的最大范围内，Stellawei 对因使用或无法使用本平台而引起的任何直接、间接、附带或惩罚性损害不承担责任。本条款受平台运营地法律管辖，任何争议应首先通过友好协商解决，协商不成可提交至有管辖权的法院。'
        : 'To the fullest extent permitted by law, Stellawei is not liable for any direct, indirect, incidental, or punitive damages arising from the use or inability to use this platform. These terms are governed by the laws of the platform\'s operating jurisdiction. Any disputes shall first be resolved through friendly negotiation, and if unresolved, submitted to a court of competent jurisdiction.',
    },
    {
      icon: Mail,
      title: isZh ? '条款更新与联系我们' : 'Updates & Contact',
      content: isZh
        ? '我们可能会不时更新本服务条款，重大变更将通过邮件或平台公告提前通知。继续使用本平台即视为接受更新后的条款。如有疑问，请联系 support@stellawei.org。'
        : 'We may update these Terms of Service from time to time. Significant changes will be notified in advance via email or platform announcements. Continued use of the platform constitutes acceptance of the updated terms. For questions, contact support@stellawei.org.',
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
              <FileText className="w-8 h-8 text-violet-600" />
            </div>
            <CardTitle className="text-2xl font-serif">
              {isZh ? '服务条款' : 'Terms of Service'}
            </CardTitle>
            <p className="text-sm text-stone-500 mt-2">
              {isZh ? '最后更新：2026年5月' : 'Last Updated: May 2026'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-sm text-stone-600 leading-relaxed">
              {isZh
                ? '欢迎使用 Stellawei！本服务条款（"条款"）适用于您访问和使用 Stellawei 平台（包括网站及相关服务）。请仔细阅读。使用本平台即表示您同意受这些条款的约束。'
                : 'Welcome to Stellawei! These Terms of Service ("Terms") apply to your access and use of the Stellawei platform (including the website and related services). Please read them carefully. By using the platform, you agree to be bound by these Terms.'}
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
                ? '继续使用 Stellawei 平台，即表示您确认已阅读、理解并同意本服务条款及我们的隐私政策。'
                : 'By continuing to use the Stellawei platform, you confirm that you have read, understood, and agree to these Terms of Service and our Privacy Policy.'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
