'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Heart, 
  Briefcase, 
  Calendar,
  Compass,
  SparklesIcon,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle,
  Star
} from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// 塔罗服务项目
const tarotServices = [
  {
    id: "love",
    icon: Heart,
    titleZh: "爱情塔罗",
    titleEn: "Love Tarot",
    subtitleZh: "以塔罗为镜，映照内心真实的情感渴望与关系真相。",
    subtitleEn: "Use Tarot as a mirror to reflect your true emotional desires and relationship truths.",
    questions: [
      "这段关系的发展方向",
      "对方的真实想法与感受",
      "如何突破感情中的停滞",
      "单身者何时遇到合适的人"
    ],
    questionsEn: [
      "The direction of this relationship",
      "The other person's true thoughts and feelings",
      "How to break through stagnation in love",
      "When singles will meet the right person"
    ],
    deliverables: [
      "凯尔特十字爱情牌阵解读",
      "关系能量流动分析",
      "具体行动建议",
      "30分钟解读 + 牌面照片与文字说明"
    ],
    deliverablesEn: [
      "Celtic Cross love spread interpretation",
      "Relationship energy flow analysis",
      "Specific action recommendations",
      "30-min session + card photos and notes"
    ],
    duration: "30 min",
    price: "$25",
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600"
  },
  {
    id: "career",
    icon: Briefcase,
    titleZh: "事业塔罗",
    titleEn: "Career Tarot",
    subtitleZh: "在职业十字路口，让直觉智慧指引你的下一步。",
    subtitleEn: "At the career crossroads, let intuitive wisdom guide your next step.",
    questions: [
      "是否应该接受这份offer",
      "职场中隐藏的机会与挑战",
      "如何改善与上司/同事的关系",
      "副业/创业的能量时机"
    ],
    questionsEn: [
      "Whether to accept this offer",
      "Hidden opportunities and challenges at work",
      "How to improve relationships with boss/colleagues",
      "Energy timing for side business/entrepreneurship"
    ],
    deliverables: [
      "事业决策牌阵解读",
      "环境能量与机会分析",
      "行动步骤与时机建议",
      "30分钟解读 + 职业发展指引"
    ],
    deliverablesEn: [
      "Career decision spread interpretation",
      "Environment energy and opportunity analysis",
      "Action steps and timing guidance",
      "30-min session + career development guide"
    ],
    duration: "30 min",
    price: "$25",
    color: "from-blue-500 to-indigo-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600"
  },
  {
    id: "fortune",
    icon: Calendar,
    titleZh: "周运月运",
    titleEn: "Weekly & Monthly",
    subtitleZh: "提前感知能量潮汐，让每一天都活出觉知与从容。",
    subtitleEn: "Sense energy tides in advance, living each day with awareness and ease.",
    questions: [
      "本周/本月需要注意的领域",
      "最佳行动时机与需要避开的陷阱",
      "如何利用这段时期的特殊能量",
      "保持能量平衡的日常建议"
    ],
    questionsEn: [
      "Areas to watch this week/month",
      "Best action timing and pitfalls to avoid",
      "How to leverage special energies of this period",
      "Daily advice for maintaining energy balance"
    ],
    deliverables: [
      "7张或12张月度牌阵",
      "各领域（爱情/事业/健康/人际）能量评级",
      "每日能量提示与建议",
      "20分钟解读 + 周/月运势卡片"
    ],
    deliverablesEn: [
      "7 or 12-card monthly spread",
      "Energy ratings for all areas (love/career/health/relationships)",
      "Daily energy tips and advice",
      "20-min session + weekly/monthly fortune cards"
    ],
    duration: "20 min",
    price: "$15",
    color: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600"
  },
  {
    id: "decision",
    icon: Compass,
    titleZh: "决策指引",
    titleEn: "Decision Guidance",
    subtitleZh: "当你站在选择的十字路口，塔罗帮你听见内心的声音。",
    subtitleEn: "When standing at the crossroads of choice, Tarot helps you hear your inner voice.",
    questions: [
      "A和B选项哪个更适合我",
      "隐藏的利弊与长期影响",
      "潜意识中的恐惧与渴望",
      "决策后的能量走向"
    ],
    questionsEn: [
      "Which option, A or B, suits me better",
      "Hidden pros/cons and long-term impacts",
      "Subconscious fears and desires",
      "Energy direction after the decision"
    ],
    deliverables: [
      "对比选择牌阵或路径分析牌阵",
      "各选项深度能量扫描",
      "直觉引导与理性分析结合",
      "25分钟解读 + 决策参考文档"
    ],
    deliverablesEn: [
      "Comparison spread or path analysis spread",
      "Deep energy scan of each option",
      "Combination of intuitive guidance and rational analysis",
      "25-min session + decision reference document"
    ],
    duration: "25 min",
    price: "$20",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600"
  },
  {
    id: "spiritual",
    icon: SparklesIcon,
    titleZh: "灵性成长",
    titleEn: "Spiritual Growth",
    subtitleZh: "与更高智慧连接，在灵性旅程中找到属于你的指引。",
    subtitleEn: "Connect with higher wisdom and find guidance for your spiritual journey.",
    questions: [
      "当前灵性发展阶段与课题",
      "阻碍灵性成长的内在模式",
      "适合你的灵性练习与方向",
      "如何深化与高我的连接"
    ],
    questionsEn: [
      "Current spiritual development stage and lessons",
      "Inner patterns blocking spiritual growth",
      "Spiritual practices and directions suitable for you",
      "How to deepen connection with higher self"
    ],
    deliverables: [
      "灵性旅程牌阵解读",
      "灵魂课题与礼物识别",
      "个人化灵性练习建议",
      "35分钟深度解读 + 灵性成长计划"
    ],
    deliverablesEn: [
      "Spiritual journey spread interpretation",
      "Soul lesson and gift identification",
      "Personalized spiritual practice recommendations",
      "35-min deep session + spiritual growth plan"
    ],
    duration: "35 min",
    price: "$30",
    color: "from-teal-500 to-cyan-500",
    bgColor: "bg-teal-50",
    textColor: "text-teal-600"
  }
];

export default function TarotServicePage() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-stellawei-purple/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stellawei-purple to-stellawei-gold"></div>
              <span className="text-xl font-serif font-bold text-stellawei-purple">
                {isZh ? "星位" : "Stellawei"}
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <div className="flex items-center space-x-2">
                <Link href="/">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    {isZh ? "返回首页" : "Home"}
                  </Button>
                </Link>
                <Link href="/services/bazi">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    {isZh ? "其它服务" : "Next"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-pink-900/5"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <SparklesIcon className="w-4 h-4" />
              <span>{isZh ? "直觉智慧" : "Intuitive Wisdom"}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6">
              {isZh ? "塔罗占卜" : "Tarot Reading"}
              <span className="gradient-text block mt-2">{isZh ? "倾听内心的声音" : "Listen to Your Inner Voice"}</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {isZh 
                ? "塔罗不是预测固定不变的命运，而是映照当下能量状态的镜子。它帮助你连接直觉智慧，在迷茫时看见内心真正的渴望与可能性。"
                : "Tarot doesn't predict a fixed fate, but mirrors your current energy state. It helps you connect with intuitive wisdom and see your true desires when feeling lost."
              }
            </p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
              {isZh ? "塔罗服务项目" : "Tarot Services"}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isZh 
                ? "带着你的问题来，让塔罗为你映照当下的能量与可能性"
                : "Bring your questions and let Tarot illuminate your present energy and possibilities"
              }
            </p>
          </div>
          
          <div className="space-y-6">
            {tarotServices.map((service) => (
              <Card key={service.id} className="overflow-hidden border-stellawei-purple/10 hover:shadow-lg transition-shadow">
                <div className="grid md:grid-cols-12 gap-0">
                  {/* Left: Service Header */}
                  <div className={`md:col-span-4 bg-gradient-to-br ${service.color} p-6 md:p-8 text-white flex flex-col justify-center`}>
                    <div className="flex items-center space-x-2 mb-4">
                      <service.icon className="w-6 h-6" />
                      <span className="text-sm font-medium opacity-90">
                        {isZh ? service.titleZh : service.titleEn}
                      </span>
                    </div>
                    
                    <h3 className="text-2xl font-serif font-bold mb-3">
                      {isZh ? service.titleZh : service.titleEn}
                    </h3>
                    
                    <p className="text-white/80 text-sm mb-4 leading-relaxed">
                      {isZh ? service.subtitleZh : service.subtitleEn}
                    </p>
                    
                    <div className="flex items-center space-x-2 text-sm opacity-90">
                      <Clock className="w-4 h-4" />
                      <span>{service.duration}</span>
                    </div>
                  </div>
                  
                  {/* Right: Details */}
                  <div className="md:col-span-8 p-6 md:p-8">
                    {/* Questions */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-sm text-stellawei-purple mb-3 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-stellawei-purple mr-2"></span>
                        {isZh ? "这能帮助你" : "This helps you with"}
                      </h4>
                      <ul className="space-y-2">
                        {(isZh ? service.questions : service.questionsEn).map((q, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-sm text-muted-foreground">
                            <span className="text-stellawei-gold mt-1">•</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Deliverables */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-sm text-stellawei-purple mb-3 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-stellawei-gold mr-2"></span>
                        {isZh ? "你将获得" : "You'll receive"}
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {(isZh ? service.deliverables : service.deliverablesEn).map((item, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm text-muted-foreground">
                        {isZh ? "时长" : "Duration"}: {service.duration}
                      </span>
                      <Link href="/masters">
                        <Button>
                          {isZh ? "预约咨询" : "Book Session"}
                          <Sparkles className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
}
