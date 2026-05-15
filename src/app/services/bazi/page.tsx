'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Heart,
  Coins,
  Briefcase,
  HeartPulse,
  GraduationCap,
  Scale,
  Home,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle,
  Star,
  Moon
} from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// 八字服务项目
const baziServices = [
  {
    id: "relationship",
    icon: Heart,
    titleZh: "感情姻缘",
    titleEn: "Love & Relationships",
    subtitleZh: "洞察情感模式，解锁亲密关系中的自我成长密码。",
    subtitleEn: "Gain insights into emotional patterns and unlock the code to self-growth in intimate relationships.",
    questions: [
      "为何总是吸引到相似类型的伴侣？",
      "感情中反复出现的矛盾模式",
      "何时是开始新恋情的最佳时机",
      "如何在关系中保持独立与亲密的平衡"
    ],
    questionsEn: [
      "Why do I always attract similar types of partners?",
      "Recurring conflict patterns in relationships",
      "When is the best time to start a new romance",
      "How to maintain balance between independence and intimacy"
    ],
    deliverables: [
      "个人命盘情感格局深度解析",
      "未来3年感情运势时间线",
      "关系相处建议与能量调和方案",
      "45分钟一对一解读 + 书面报告"
    ],
    deliverablesEn: [
      "In-depth analysis of emotional patterns in your birth chart",
      "3-year relationship fortune timeline",
      "Relationship advice and energy harmonization plan",
      "45-min one-on-one session + written report"
    ],
    duration: "45 min",
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600"
  },
  {
    id: "wealth",
    icon: Coins,
    titleZh: "财运",
    titleEn: "Wealth & Prosperity",
    subtitleZh: "识别你的财富能量周期，在正确的时间做正确的财务决策。",
    subtitleEn: "Identify your wealth energy cycles and make the right financial decisions at the right time.",
    questions: [
      "收入瓶颈期何时结束",
      "投资/创业的最佳时机窗口",
      "财富流失的潜在原因",
      "如何激活个人财运能量"
    ],
    questionsEn: [
      "When will the income plateau end",
      "Optimal timing windows for investment/entrepreneurship",
      "Underlying causes of wealth leakage",
      "How to activate personal wealth energy"
    ],
    deliverables: [
      "财星格局与流年财运分析",
      "未来5年财富趋势预测",
      "适合的投资类型与行业方向",
      "40分钟解读 + 财运时间轴图表"
    ],
    deliverablesEn: [
      "Wealth star pattern and annual fortune analysis",
      "5-year wealth trend forecast",
      "Suitable investment types and industry directions",
      "40-min session + wealth timeline chart"
    ],
    duration: "40 min",
    color: "from-amber-500 to-yellow-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600"
  },
  {
    id: "career",
    icon: Briefcase,
    titleZh: "事业",
    titleEn: "Career & Purpose",
    subtitleZh: "解码你的天赋使命，找到事业发展的最佳路径。",
    subtitleEn: "Decode your soul's calling and find the optimal path for career development.",
    questions: [
      "当前工作是否符合我的天赋",
      "跳槽/转型的最佳时机",
      "职场人际关系的深层模式",
      "如何发挥最大潜能"
    ],
    questionsEn: [
      "Does my current job align with my talents",
      "Best timing for job change/career transition",
      "Deep patterns in workplace relationships",
      "How to maximize your potential"
    ],
    deliverables: [
      "事业宫位与官禄格局分析",
      "适合的职业方向与发展阶段建议",
      "未来3年事业转折点预测",
      "50分钟解读 + 职业规划建议书"
    ],
    deliverablesEn: [
      "Career palace and official prosperity pattern analysis",
      "Recommended career directions and development stages",
      "3-year career turning point forecast",
      "50-min session + career planning guide"
    ],
    duration: "50 min",
    color: "from-blue-500 to-indigo-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600"
  },
  {
    id: "health",
    icon: HeartPulse,
    titleZh: "健康",
    titleEn: "Health & Vitality",
    subtitleZh: "了解身体与能量的深层连接，预防胜于治疗。",
    subtitleEn: "Understand the deep connection between body and energy-prevention is better than cure.",
    questions: [
      "容易疲劳或亚健康状态的根本原因",
      "需要特别关注的身体部位与时期",
      "如何通过生活方式调整提升能量",
      "情绪与健康之间的关联模式"
    ],
    questionsEn: [
      "Root causes of fatigue or sub-health conditions",
      "Body areas and periods requiring special attention",
      "How to boost energy through lifestyle adjustments",
      "Connection patterns between emotions and health"
    ],
    deliverables: [
      "日主强弱与五行平衡分析",
      "健康隐患时期预警",
      "个性化养生与能量调理建议",
      "35分钟解读 + 健康养护指南"
    ],
    deliverablesEn: [
      "Day master strength and Five Elements balance analysis",
      "Health risk period alerts",
      "Personalized wellness and energy regulation advice",
      "35-min session + health maintenance guide"
    ],
    duration: "35 min",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50",
    textColor: "text-green-600"
  },
  {
    id: "education",
    icon: GraduationCap,
    titleZh: "学业",
    titleEn: "Education & Learning",
    subtitleZh: "发现你的学习风格与智力优势，让成长事半功倍。",
    subtitleEn: "Discover your learning style and intellectual strengths for effortless growth.",
    questions: [
      "最适合的学习方式与环境",
      "考试/升学的有利时期",
      "专业选择的能量匹配度",
      "如何克服学习障碍与瓶颈"
    ],
    questionsEn: [
      "Most suitable learning methods and environments",
      "Favorable periods for exams/academic advancement",
      "Energy compatibility of major/course selection",
      "How to overcome learning obstacles and bottlenecks"
    ],
    deliverables: [
      "印星与食伤格局分析",
      "学习运势时间线",
      "考试/升学最佳时机建议",
      "30分钟解读 + 学习发展报告"
    ],
    deliverablesEn: [
      "Seal star and Output star pattern analysis",
      "Academic fortune timeline",
      "Optimal timing advice for exams/advancement",
      "30-min session + learning development report"
    ],
    duration: "30 min",
    color: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600"
  },
  {
    id: "legal",
    icon: Scale,
    titleZh: "官司预测",
    titleEn: "Legal Matters",
    subtitleZh: "洞察法律事务中的能量走向，帮助你在纠纷中保持清晰与从容。",
    subtitleEn: "Gain insights into the energy flow of legal matters, helping you stay clear and composed in disputes.",
    questions: [
      "诉讼结果的倾向性分析",
      "和解与坚持诉讼的时机选择",
      "如何在法律程序中保护自身能量",
      "避免未来法律纠纷的预防建议"
    ],
    questionsEn: [
      "Tendency analysis of litigation outcomes",
      "Timing choices for settlement vs. proceeding",
      "How to protect your energy during legal processes",
      "Preventive advice to avoid future legal disputes"
    ],
    deliverables: [
      "官非星与流年运势交叉分析",
      "诉讼时间线能量走向预测",
      "策略性建议与时机把握",
      "40分钟解读 + 案件能量评估报告"
    ],
    deliverablesEn: [
      "Official conflict star and annual fortune cross-analysis",
      "Litigation timeline energy flow forecast",
      "Strategic advice and timing guidance",
      "40-min session + case energy assessment report"
    ],
    duration: "40 min",
    color: "from-slate-500 to-gray-500",
    bgColor: "bg-slate-50",
    textColor: "text-slate-600"
  },
  {
    id: "fengshui",
    icon: Home,
    titleZh: "阳宅调理",
    titleEn: "Space Energy Harmonization",
    subtitleZh: "让你的居住空间成为支持成长与幸福的能量场。",
    subtitleEn: "Transform your living space into an energy field that supports growth and happiness.",
    questions: [
      "家中某些区域总是让人感到不适",
      "睡眠质量与居家环境的关联",
      "如何通过空间调整改善家庭关系",
      "提升专注力与创造力的环境布置"
    ],
    questionsEn: [
      "Certain areas at home always feel uncomfortable",
      "Connection between sleep quality and home environment",
      "How to improve family relationships through space adjustment",
      "Environment setup for enhanced focus and creativity"
    ],
    deliverables: [
      "结合八字的个性化风水建议",
      "房屋平面图能量分析",
      "家具摆放与色彩能量调和方案",
      "60分钟解读（含空间 walkthrough）+ 调理清单"
    ],
    deliverablesEn: [
      "Personalized Feng Shui advice based on your Bazi",
      "Floor plan energy analysis",
      "Furniture placement and color energy harmonization plan",
      "60-min session (with space walkthrough) + adjustment checklist"
    ],
    duration: "60 min",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600"
  }
];

export default function BaziServicePage() {
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
                <Link href="/services/spiritual">
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
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/5 via-transparent to-purple-900/5"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Moon className="w-4 h-4" />
              <span>{isZh ? "中华传统命理" : "Chinese Metaphysics"}</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6">
              {isZh ? "八字命理" : "Bazi Four Pillars"}
              <span className="gradient-text block mt-2">{isZh ? "能量趋势分析" : "Energy Analysis"}</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {isZh 
                ? "八字不是预测命运，而是解读你出生时刻的能量印记。了解这些能量趋势，帮助你在对的时间做出对的选择，活出更觉知的人生。"
                : "Bazi is not about predicting fate, but reading the energy imprint of your birth moment. Understanding these energy trends helps you make the right choices at the right time."
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
              {isZh ? "服务项目" : "Our Services"}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isZh
                ? "根据你当下的需求，选择最适合的解读方向"
                : "Choose the direction that best fits your current needs"
              }
            </p>
          </div>

          <div className="space-y-6">
            {baziServices.map((service) => (
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

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">
            {isZh ? "准备好探索你的能量地图了吗？" : "Ready to explore your energy map?"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isZh
              ? "我们的八字大师将帮助你解码命盘，发现人生机遇"
              : "Our Bazi masters will help you decode your chart and discover life opportunities"
            }
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/masters">
              <Button size="lg" className="px-8">
                {isZh ? "选择师傅" : "Choose a Master"}
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
