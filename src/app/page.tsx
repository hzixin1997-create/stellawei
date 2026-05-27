'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Shield, Clock, Sparkles, Moon, Sun, Users, Heart, Briefcase, Coins, Sparkles as SparklesIcon, User, X, Menu, MessageCircle, Video, Compass } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// 角色路由映射
const ROUTE_MAP: Record<string, string> = {
  'qimenyihua@gmail.com': '/master/dashboard',
  'mshoucangjia@gmail.com': '/master/dashboard',
  'lunalintarot@163.com': '/master/dashboard',
  'hzixin1997@gmail.com': '/admin/dashboard',
};

function getDashboardRoute(email: string): string {
  return ROUTE_MAP[email.trim().toLowerCase()] || '/user/dashboard';
}

// 涛涛调研的热点问题 - 轮播文案
const carouselQuestions = [
  { en: "Will my ex come back? 💕", zh: "前任会回来吗？💕" },
  { en: "When will I meet my soulmate? 💫", zh: "何时遇见灵魂伴侣？💫" },
  { en: "Should I quit my job? 💼", zh: "我该辞职吗？💼" },
  { en: "How can I manifest more money? 💰", zh: "如何显化更多财富？💰" },
  { en: "What is my life purpose? 🔮", zh: "我的人生使命是什么？🔮" },
  { en: "Is he the one? ❤️", zh: "他是真命天子吗？❤️" },
  { en: "Will my business succeed? 🚀", zh: "我的事业会成功吗？🚀" },
];

const services = [
  {
    id: "tarot",
    nameKey: "services.tarot.name",
    descriptionKey: "services.tarot.description",
    price: "$15-25",
    duration: "15-20 min",
    icon: Sparkles,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "eastern",
    nameKey: "services.eastern.name",
    descriptionKey: "services.eastern.description",
    price: "$45-55",
    duration: "30-40 min",
    icon: Compass,
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "spiritual",
    nameKey: "services.spiritual.name",
    descriptionKey: "services.spiritual.description",
    price: "$60-80",
    duration: "40-60 min",
    icon: Sun,
    color: "from-indigo-500 to-purple-600",
  },
]

// 热门咨询问题 - 基于涛涛调研数据
const hotQuestions = [
  { text: "When will I meet my soulmate?", textZh: "我什么时候会遇到灵魂伴侣？", icon: Heart },
  { text: "Is he/she the right person for me?", textZh: "他/她是对的人吗？", icon: Heart },
  { text: "Should I change my career path?", textZh: "我应该转行吗？", icon: Briefcase },
  { text: "Will I get a promotion this year?", textZh: "今年我会升职吗？", icon: Briefcase },
  { text: "How can I improve my financial situation?", textZh: "如何改善我的财务状况？", icon: Coins },
  { text: "What is my spiritual path?", textZh: "我的灵性道路是什么？", icon: SparklesIcon },
  { text: "Am I on the right life path?", textZh: "我走在正确的人生道路上吗？", icon: SparklesIcon },
  { text: "How to heal from past trauma?", textZh: "如何治愈过去的创伤？", icon: Heart },
]

// 滚动轮播热门问题 - 首页顶部简化版
function QuestionsMarqueeTop() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  
  return (
    <div className="overflow-hidden">
      <div className="flex gap-6 animate-marquee-top">
        {/* 复制三份实现无缝滚动 */}
        {[...hotQuestions, ...hotQuestions, ...hotQuestions].map((q, idx) => (
          <div 
            key={idx}
            className="flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-5 sm:py-2 flex items-center gap-2"
          >
            <q.icon className="w-3 h-3 sm:w-4 sm:h-4 text-stellawei-gold" />
            <span className="text-white text-xs sm:text-sm whitespace-nowrap">
              {isZh ? q.textZh : q.text}
            </span>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        @keyframes marquee-top {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee-top {
          animation: marquee-top 25s linear infinite;
        }
      `}</style>
    </div>
  );
}

const masters = [
  {
    id: "master-luna",
    name: "Master Luna",
    nameCn: "卢娜师傅",
    specialty: "Tarot & Astrology / 塔罗与占星",
    specialtyCn: "塔罗占卜、西方占星",
    experience: "10+ years / 10年以上经验",
    experienceCn: "10年神秘学实践经验",
    rating: 4.9,
    reviews: 312,
    image: "/masters/master_luna.jpg",
    tagline: "Illuminating your path through the wisdom of the stars",
    taglineCn: "通过星辰的智慧照亮您的人生道路",
  },
  {
    id: "zhang-yihua",
    name: "Master Zhang Yihua",
    nameCn: "张易桦",
    specialty: "Qi Men Dun Jia / 奇门遁甲",
    specialtyCn: "奇门遁甲、六爻占卜",
    experience: "8 years / 8年经验",
    experienceCn: "8年中华玄学经验",
    rating: 4.9,
    reviews: 156,
    image: "/masters/master_zhang_yihua.jpg",
    tagline: "Revealing the unseen patterns of timing and destiny",
    taglineCn: "揭露时空能量学的密码，通过决策学来选择正确的风向",
  },
  {
    id: "wu-yang",
    name: "Master Wu Yang",
    nameCn: "戊阳",
    specialty: "BaZi & Feng Shui / 八字命理与风水",
    specialtyCn: "八字分析、风水咨询",
    experience: "12+ years / 12年以上经验",
    experienceCn: "12年中华玄学实践经验",
    rating: 4.9,
    reviews: 248,
    image: "/masters/master_wu_yang.jpg",
    tagline: "Align your path with the flow of cosmic energy",
    taglineCn: "通过八字与环境能量分析，帮助您顺应有利时机行事",
  },
]

export default function Home() {
  const { t, i18n } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isZh = i18n.language === 'zh';

  // 轮播效果
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentQuestion((prev) => (prev + 1) % carouselQuestions.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 检查用户登录状态
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
      setUser(data.session?.user ?? null);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: any, session: any) => {
        setUser(session?.user ?? null);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);

  const router = useRouter();

  // 未登录时跳转注册/登录页，已登录时跳转booking
  const handleBookingClick = () => {
    if (!user) {
      router.push('/auth/login');
    } else {
      router.push('/booking');
    }
  };

  const currentLang = i18n.language || 'en';
  const displayQuestion = currentLang === 'zh' 
    ? carouselQuestions[currentQuestion].zh 
    : carouselQuestions[currentQuestion].en;

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-stellawei-purple/10 w-full">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 min-w-0">
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-stellawei-purple to-stellawei-gold shrink-0"></div>
              <span className="text-base sm:text-xl font-serif font-bold text-stellawei-purple truncate">{t('brand')}</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-foreground/70 hover:text-stellawei-purple transition-colors">{t('nav.services')}</a>
              <a href="#masters" className="text-foreground/70 hover:text-stellawei-purple transition-colors">{t('nav.masters')}</a>
              <a href="#trust" className="text-foreground/70 hover:text-stellawei-purple transition-colors">{t('nav.trust')}</a>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4 shrink-0">
              <div className="scale-90 sm:scale-100 origin-right">
                <LanguageSwitcher />
              </div>
              {/* 移动端汉堡菜单按钮 */}
              <button
                className="md:hidden p-1.5 rounded-lg hover:bg-stone-100 shrink-0"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {user ? (
                <Link href={user?.email ? getDashboardRoute(user.email) : '/auth/login'} className="hidden sm:flex items-center space-x-2 text-sm text-foreground/70 hover:text-stellawei-purple transition-colors shrink-0">
                  <User className="w-4 h-4" />
                  <span className="hidden lg:inline">{user.email}</span>
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className="hidden sm:inline-flex shrink-0">
                    <Button variant="ghost" size="sm" className="text-xs sm:text-sm px-2 h-8">{t('nav.signIn')}</Button>
                  </Link>
                  <Link href="/auth/login" className="shrink-0">
                    <Button size="sm" className="text-xs px-2 sm:px-3 h-8">{t('nav.getStarted')}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 移动端菜单 */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <span className="font-serif font-bold text-stellawei-purple">{t('brand')}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <a href="#services" className="text-foreground/70 hover:text-stellawei-purple py-2 border-b border-stone-100" onClick={() => setMobileMenuOpen(false)}>{t('nav.services')}</a>
            <a href="#masters" className="text-foreground/70 hover:text-stellawei-purple py-2 border-b border-stone-100" onClick={() => setMobileMenuOpen(false)}>{t('nav.masters')}</a>
            <a href="#trust" className="text-foreground/70 hover:text-stellawei-purple py-2 border-b border-stone-100" onClick={() => setMobileMenuOpen(false)}>{t('nav.trust')}</a>
            {user ? (
              <Link href={user?.email ? getDashboardRoute(user.email) : '/auth/login'} className="text-foreground/70 hover:text-stellawei-purple py-2" onClick={() => setMobileMenuOpen(false)}>
                {isZh ? '我的账户' : 'My Account'}
              </Link>
            ) : (
              <Link href="/auth/login" className="text-foreground/70 hover:text-stellawei-purple py-2" onClick={() => setMobileMenuOpen(false)}>
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 热门问题轮播 - 首页最顶部 */}
      <div className="fixed top-16 left-0 right-0 z-40 bg-stellawei-purple py-3 overflow-hidden w-full">
        <QuestionsMarqueeTop />
      </div>

      {/* Hero Section */}
      <section className="relative pt-48 pb-20 lg:pt-56 lg:pb-32 overflow-hidden w-full">
        <div className="absolute inset-0 bg-gradient-to-br from-stellawei-purple/5 via-transparent to-stellawei-gold/5"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-stellawei-purple/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-stellawei-gold/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-serif font-bold mb-4 sm:mb-6 leading-[1.15] sm:leading-[1.2]">
              {t('hero.title')}
              <span className="safe-gradient-text block mt-1 sm:mt-2">{t('hero.titleHighlight')}</span>
            </h1>
            
            <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-10 max-w-2xl mx-auto px-2 sm:px-0">
              {t('hero.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Button size="lg" className="text-sm sm:text-lg px-4 sm:px-8 w-full sm:w-auto max-w-[280px] sm:max-w-none whitespace-normal break-words leading-tight py-2 h-auto sm:h-11" onClick={handleBookingClick}>
                {t('hero.ctaPrimary')}
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-sm sm:text-lg px-4 sm:px-8 w-full sm:w-auto max-w-[280px] sm:max-w-none whitespace-normal break-words leading-tight py-2 h-auto sm:h-11"
                onClick={() => {
                  const servicesSection = document.getElementById('services');
                  if (servicesSection) {
                    servicesSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {t('hero.ctaSecondary')}
              </Button>
            </div>
            
            <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-stellawei-gold fill-stellawei-gold" />
                <span>{t('hero.rating')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-stellawei-purple" />
                <span>{t('hero.readings')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span>{t('hero.secure')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 bg-white/50 overflow-hidden w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-serif font-bold mb-4">{t('services.title')}</h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
              {t('services.subtitle')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 sm:gap-8">
            {services.map((service) => (
              <Card key={service.id} className="group hover:shadow-lg transition-shadow border-stellawei-purple/10 p-4 sm:p-6">
                <div className="flex items-start gap-4 sm:block">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center shrink-0 sm:mb-4 group-hover:scale-110 transition-transform`}>
                    <service.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-lg sm:text-xl font-semibold mb-1 sm:mb-2">{t(service.nameKey)}</h3>
                    <p className="text-sm text-muted-foreground mb-3 sm:mb-4">{t(service.descriptionKey)}</p>
                    <div className="flex items-center justify-between sm:justify-end">
                      <span className="text-sm font-medium text-stellawei-purple sm:hidden">{service.price}</span>
                      <Link href={service.id === 'eastern' ? '/services/bazi' : `/services/${service.id}`}>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">{t('services.learnMore')}</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Masters Section */}
      <section id="masters" className="py-20 bg-white/50 overflow-hidden w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-4xl font-serif font-bold mb-4">{t('masters.title')}</h2>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4 sm:px-0">
              {t('masters.subtitle')}
            </p>
          </div>

          {/* View All Masters Button - Above master cards */}
          <div className="text-center mb-12">
            <Link href="/masters">
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-6 text-lg border-2 border-stellawei-purple text-stellawei-purple hover:bg-stellawei-purple hover:text-white transition-all"
              >
                {t('masters.viewAll')}
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-8">
            {masters.map((master) => (
              <Card key={master.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                <div className="h-48 sm:h-64 bg-gradient-to-br from-stellawei-purple/20 to-stellawei-gold/20 relative shrink-0">
                  <picture>
                    <source srcSet={master.image.replace('.jpg', '.webp')} type="image/webp" />
                    <img
                      src={master.image}
                      alt={currentLang === 'zh' ? master.nameCn : master.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </picture>
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/90 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center space-x-1">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 text-stellawei-gold fill-stellawei-gold" />
                    <span className="text-xs sm:text-sm font-semibold">{master.rating}</span>
                  </div>
                </div>
                
                <CardHeader className="pb-2 px-4 sm:px-6 pt-4 shrink-0">
                  <CardTitle className="text-lg sm:text-xl">{currentLang === 'zh' ? master.nameCn : master.name}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm line-clamp-2 min-h-[2.5rem]">
                    {currentLang === 'zh' ? master.taglineCn : master.tagline}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-2 pt-0 px-4 sm:px-6 pb-4 flex-1 flex flex-col justify-end">
                  <div className="flex items-center justify-between text-xs sm:text-sm min-w-0">
                    <span className="text-muted-foreground shrink-0 mr-2">{t('masters.specialty')}</span>
                    <span className="font-medium text-right truncate">{currentLang === 'zh' ? master.specialtyCn : master.specialty}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm min-w-0">
                    <span className="text-muted-foreground shrink-0 mr-2">{t('masters.experience')}</span>
                    <span className="font-medium">{currentLang === 'zh' ? master.experienceCn : master.experience}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm min-w-0">
                    <span className="text-muted-foreground shrink-0 mr-2">{t('masters.reviews')}</span>
                    <span className="font-medium">{master.reviews}</span>
                  </div>
                  
                  <Link href={`/masters/${master.id}`}>
                    <Button className="w-full mt-2 text-sm">{currentLang === 'zh' ? '点击了解' : 'Learn More'}</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" className="py-20 overflow-hidden w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-stellawei-purple to-stellawei-purple-dark rounded-3xl p-6 sm:p-8 md:p-12 text-white">
            <div className="text-center mb-8 sm:mb-12">
              <Shield className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 text-stellawei-gold" />
              <h2 className="text-2xl sm:text-4xl font-serif font-bold mb-3 sm:mb-4">{t('trust.title')}</h2>
              <p className="text-sm sm:text-lg text-white/80 max-w-2xl mx-auto px-2 sm:px-0">
                {t('trust.subtitle')}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-stellawei-gold" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2 leading-snug">{t('trust.antiFraud.title')}</h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">{t('trust.antiFraud.description')}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <Coins className="w-6 h-6 sm:w-8 sm:h-8 text-stellawei-gold" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2 leading-snug">{t('trust.pricing.title')}</h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">{t('trust.pricing.description')}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <Star className="w-6 h-6 sm:w-8 sm:h-8 text-stellawei-gold" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2 leading-snug">{t('trust.refund.title')}</h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">{t('trust.refund.description')}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 text-stellawei-gold" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2 leading-snug">{t('trust.verified.title')}</h3>
                <p className="text-xs sm:text-sm text-white/70 leading-relaxed">{t('trust.verified.description')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 overflow-hidden w-full">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-4xl font-serif font-bold mb-4 sm:mb-6">{t('cta.title')}</h2>
          {/* subtitle 已移除 */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="text-lg px-8" onClick={handleBookingClick}>
              {t('cta.claim')}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8"
              onClick={() => {
                const servicesSection = document.getElementById('services');
                if (servicesSection) {
                  servicesSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {t('cta.browse')}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stellawei-purple text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="mb-2 sm:mb-0">
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stellawei-gold to-stellawei-gold-light"></div>
                <span className="text-lg sm:text-xl font-serif font-bold">{t('brand')}</span>
              </div>
              <p className="text-white/70 text-xs sm:text-sm">
                {t('footer.tagline')}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.services')}</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/70">
                <li><a href="/services/tarot" className="hover:text-white">{t('services.tarot.name')}</a></li>
                <li><a href="/services/bazi" className="hover:text-white">{t('services.eastern.name')}</a></li>
                <li><a href="/services/spiritual" className="hover:text-white">{t('services.spiritual.name')}</a></li>
                <li><span className="text-white/40 cursor-default">{isZh ? '社区服务' : 'Community Services'}</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.company')}</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/70">
                <li><a href="#" className="hover:text-white">{t('footer.aboutUs')}</a></li>
                <li><a href="#" className="hover:text-white">{t('footer.trustSafety')}</a></li>
                <li><a href="#" className="hover:text-white">{t('footer.careers')}</a></li>
                <li><a href="#" className="hover:text-white">{t('footer.contact')}</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">{t('footer.support')}</h4>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-white/70">
                <li><a href="/help" className="hover:text-white">{t('footer.helpCenter')}</a></li>
                <li><a href="/refund-policy" className="hover:text-white">{t('footer.refundPolicy')}</a></li>
                <li><a href="/privacy" className="hover:text-white">{t('footer.privacyPolicy')}</a></li>
                <li><a href="/terms" className="hover:text-white">{t('footer.termsOfService')}</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/20 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-white/60">
            <p>{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
