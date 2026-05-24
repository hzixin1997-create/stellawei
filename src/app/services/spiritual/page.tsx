'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Eye, 
  Leaf, 
  Zap, 
  Brain,
  Compass,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle,
  Star,
  Sun
} from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// 灵性探索服务项目
const spiritualServices = [
  {
    id: "awareness",
    icon: Eye,
    titleZh: "内在觉察",
    titleEn: "Inner Awareness",
    subtitleZh: "在静默中遇见真实的自己，开启深度自我对话的旅程。",
    subtitleEn: "Meet your authentic self in stillness, beginning a journey of deep self-dialogue.",
    questions: [
      "总是感到内心有声音却不知如何倾听",
      "情绪反应模式的深层根源",
      "自动化的思维习惯如何影响生活",
      "建立与内在智慧的稳定连接"
    ],
    questionsEn: [
      "Always feeling an inner voice but don't know how to listen",
      "Deep roots of emotional reaction patterns",
      "How automated thinking habits affect life",
      "Establishing stable connection with inner wisdom"
    ],
    deliverables: [
      "1对1觉察引导对话（50分钟）",
      "个性化觉察练习设计",
      "情绪与能量日志模板",
      "持续陪伴与反馈（可选4周跟进）"
    ],
    deliverablesEn: [
      "1-on-1 awareness guidance session (50 min)",
      "Personalized awareness practice design",
      "Emotion and energy journal template",
      "Ongoing support and feedback (optional 4-week follow-up)"
    ],
    duration: "50 min",
    price: "$55",
    color: "from-cyan-500 to-blue-500",
    bgColor: "bg-cyan-50"
  },
  {
    id: "growth",
    icon: Leaf,
    titleZh: "灵性成长",
    titleEn: "Spiritual Development",
    subtitleZh: "系统性地扩展意识维度，在灵性道路上稳步前行。",
    subtitleEn: "Systematically expand consciousness and steadily progress on the spiritual path.",
    questions: [
      "灵性觉醒初期的困惑与迷茫",
      "如何整合灵性体验与日常生活",
      "加速灵性成长的有效方法",
      "辨别真假灵性指引的能力"
    ],
    questionsEn: [
      "Confusion and uncertainty in early spiritual awakening",
      "How to integrate spiritual experiences with daily life",
      "Effective methods to accelerate spiritual growth",
      "Ability to discern true from false spiritual guidance"
    ],
    deliverables: [
      "灵性发展阶段评估",
      "个性化成长路径规划",
      "每周灵性练习指导",
      "月度深度回顾与调整（3个月计划）"
    ],
    deliverablesEn: [
      "Spiritual development stage assessment",
      "Personalized growth path planning",
      "Weekly spiritual practice guidance",
      "Monthly deep review and adjustment (3-month plan)"
    ],
    duration: "3 months",
    price: "$150",
    color: "from-emerald-500 to-green-500",
    bgColor: "bg-emerald-50"
  },
  {
    id: "healing",
    icon: Zap,
    titleZh: "能量疗愈",
    titleEn: "Energy Healing",
    subtitleZh: "清理阻塞的能量，让生命力量自由流动。",
    subtitleEn: "Clear blocked energy and let life force flow freely.",
    questions: [
      "长期感到能量低落或沉重",
      "特定部位的不适与能量阻塞",
      "情绪创伤在能量层面的印记",
      "需要清除的外来能量影响"
    ],
    questionsEn: [
      "Chronic low energy or feeling heavy",
      "Discomfort and energy blocks in specific areas",
      "Emotional trauma imprints on energy level",
      "External energy influences needing clearance"
    ],
    deliverables: [
      "远距离能量扫描与评估",
      "定制化能量清理与平衡",
      "疗愈过程录音与反馈",
      "自我能量维护技巧教学（45分钟疗程 + 15分钟讲解）"
    ],
    deliverablesEn: [
      "Distant energy scan and assessment",
      "Customized energy clearing and balancing",
      "Healing session recording and feedback",
      "Self-energy maintenance technique teaching (45-min session + 15-min explanation)"
    ],
    duration: "60 min",
    price: "$65",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50"
  },
  {
    id: "meditation",
    icon: Brain,
    titleZh: "冥想引导",
    titleEn: "Guided Meditation",
    subtitleZh: "在声音的引领下，进入深度放松与内在探索的宁静空间。",
    subtitleEn: "Enter a serene space of deep relaxation and inner exploration, guided by voice.",
    questions: [
      "冥想时无法静心或总是走神",
      "想要尝试特定类型的冥想体验",
      "需要针对特定意图的冥想（显化/疗愈/连接）",
      "建立稳定的冥想习惯"
    ],
    questionsEn: [
      "Unable to calm mind or easily distracted during meditation",
      "Want to try specific types of meditation experiences",
      "Need meditation for specific intentions (manifestation/healing/connection)",
      "Establishing a stable meditation habit"
    ],
    deliverables: [
      "实时引导冥想（30-45分钟）",
      "个性化冥想脚本录制",
      "不同意图的冥想方案库",
      "冥想效果追踪与调整建议"
    ],
    deliverablesEn: [
      "Live guided meditation (30-45 min)",
      "Personalized meditation script recording",
      "Meditation program library for different intentions",
      "Meditation effectiveness tracking and adjustment suggestions"
    ],
    duration: "45 min",
    price: "$45",
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50"
  },
  {
    id: "purpose",
    icon: Compass,
    titleZh: "生命目的探索",
    titleEn: "Life Purpose Discovery",
    subtitleZh: "揭开灵魂此生的使命蓝图，活出有意义且充实的人生。",
    subtitleEn: "Uncover your soul's mission blueprint for this lifetime and live a meaningful, fulfilling life.",
    questions: [
      "\"我的人生意义是什么\"的深层困惑",
      "天赋与热情如何转化为使命",
      "为何总觉得生活缺少方向感",
      "如何在日常中体现生命目的"
    ],
    questionsEn: [
      "Deep confusion about 'What is my life purpose'",
      "How talents and passions transform into mission",
      "Why life always feels directionless",
      "How to embody life purpose in daily life"
    ],
    deliverables: [
      "生命目的深度探索对话（90分钟）",
      "天赋、热情、世界需求交集分析",
      "生命目的声明撰写",
      "90天实践计划与跟进支持"
    ],
    deliverablesEn: [
      "Life purpose deep exploration session (90 min)",
      "Analysis of intersection between talents, passions, and world needs",
      "Life purpose statement crafting",
      "90-day implementation plan and follow-up support"
    ],
    duration: "90 min",
    price: "$85",
    color: "from-rose-500 to-pink-500",
    bgColor: "bg-rose-50"
  }
];

export default function SpiritualServicePage() {
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
                <Link href="/services/tarot">
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
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-orange-900/5"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-gradient-to-r from-amber-300/20 to-orange-300/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sun className="w-4 h-4" />
              <span>{isZh ? "灵性觉醒" : "Spiritual Awakening"}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6">
              {isZh ? "灵性探索" : "Spiritual"}
              <span className="gradient-text block mt-2">{isZh ? "觉醒内在光芒" : "Exploration"}</span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {isZh 
                ? "灵性成长是一场回归真我的旅程。在这里，你将获得专业的陪伴与指引，探索内在世界，扩展意识维度，活出更加觉知、自由与丰盛的人生。"
                : "Spiritual growth is a journey back to your authentic self. Here, you'll receive professional companionship and guidance to explore your inner world, expand consciousness, and live a more aware, free, and abundant life."
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
              {isZh ? "灵性服务项目" : "Spiritual Services"}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {isZh 
                ? "根据你当下的灵性成长需求，选择最适合的指引服务"
                : "Choose the guidance service that best fits your current spiritual growth needs"
              }
            </p>
          </div>
          
          <div className="space-y-6">
            {spiritualServices.map((service) => (
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
