'use client';

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Star, Shield, Clock, Sparkles, Moon, Sun, Users, Heart, Briefcase, Coins, Sparkles as SparklesIcon, User, X, Menu, MessageCircle, Video, Compass, ChevronRight, Mic } from "lucide-react"
import Link from "next/link"
import { ActiveBookingBanner } from "@/components/ActiveBookingBanner";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Testimonials from "@/components/Testimonials";

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

const services = [
  {
    id: "tarot",
    nameKey: "services.tarot.name",
    descriptionKey: "services.tarot.description",
    icon: Sparkles,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    id: "eastern",
    nameKey: "services.eastern.name",
    descriptionKey: "services.eastern.description",
    icon: Compass,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "spiritual",
    nameKey: "services.spiritual.name",
    descriptionKey: "services.spiritual.description",
    icon: Sun,
    gradient: "from-indigo-500 to-purple-600",
  },
]

const hotQuestions = [
  { text: "When will I meet my soulmate?", textZh: "我什么时候会遇到灵魂伴侣？", icon: Heart },
  { text: "Is he/she the right person for me?", textZh: "他/她是对的人吗？", icon: Heart },
  { text: "Should I change my career path?", textZh: "我应该转行吗？", icon: Briefcase },
  { text: "Will I get a promotion this year?", textZh: "今年我会升职吗？", icon: Briefcase },
  { text: "How can I improve my financial situation?", textZh: "如何改善我的财务状况？", icon: Coins },
  { text: "What is my spiritual path?", textZh: "我的灵性道路是什么？", icon: SparklesIcon },
  { text: "Am I on the right life path?", textZh: "我走在正确的人生道路上吗？", icon: SparklesIcon },
  { text: "How to heal from past trauma?", textZh: "如何治愈过去的创伤？", icon: Heart },
];

const masters = [
  {
    id: "master-luna",
    name: "Master Luna",
    nameCn: "卢娜师傅",
    specialty: "Tarot & Astrology",
    specialtyCn: "塔罗与占星",
    experience: "8+ years",
    experienceCn: "8年以上经验",
    rating: 4.9,
    reviews: 24,
    image: "/masters/master_luna.jpg",
    tagline: "Illuminating your path through the wisdom of the stars",
    taglineCn: "通过星辰的智慧照亮您的人生道路",
  },
  {
    id: "zhang-yihua",
    name: "Master Zhang Yihua",
    nameCn: "张易桦",
    specialty: "Qi Men Dun Jia",
    specialtyCn: "奇门遁甲",
    experience: "8+ years",
    experienceCn: "8年以上经验",
    rating: 4.9,
    reviews: 35,
    image: "/masters/master_zhang_yihua.jpg",
    tagline: "Revealing the unseen patterns of timing and destiny",
    taglineCn: "揭露时空能量学的密码",
  },
  {
    id: "wu-yang",
    name: "Master Wu Yang",
    nameCn: "戊阳",
    specialty: "BaZi & Feng Shui",
    specialtyCn: "八字与风水",
    experience: "12+ years",
    experienceCn: "12年以上经验",
    rating: 4.9,
    reviews: 28,
    image: "/masters/master_wu_yang.jpg",
    tagline: "Align your path with the flow of cosmic energy",
    taglineCn: "通过八字与环境能量分析",
  },
]

export default function Home() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isZh = i18n.language === 'zh';
  const router = useRouter();

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

  const [activeMasterIdx, setActiveMasterIdx] = useState(0)
  const [bgLoaded, setBgLoaded] = useState({ luna: false, eastern: false })

  // 预加载背景图
  useEffect(() => {
    const preload = (src: string, key: 'luna' | 'eastern') => {
      const img = new Image()
      img.onload = () => setBgLoaded(prev => ({ ...prev, [key]: true }))
      img.src = src
    }
    preload('/images/hero-bg-luna.webp', 'luna')
    preload('/images/hero-bg-eastern.webp', 'eastern')
  }, [])

  // 背景图根据选中的师傅切换
  const isLunaBg = activeMasterIdx === 0

  const handleBookingClick = () => {
    if (!user) {
      router.push('/auth/login');
    } else {
      router.push('/booking');
    }
  };

  return (
    <div className="min-h-screen relative isolate">
      {/* Background images — desktop with photo, mobile with gradient */}
      <div className="absolute inset-0">
        {/* Base dark background to prevent white flash during transition */}
        <div className="absolute inset-0 bg-black" />
        {/* Desktop: Luna background photo */}
        <div 
          className="absolute inset-0 transition-opacity duration-700 ease-in-out bg-cover bg-center bg-no-repeat bg-fixed hidden md:block"
          style={{ 
            backgroundImage: `url(/images/hero-bg-luna.webp)`,
            opacity: isLunaBg ? 1 : 0
          }} 
        />
        {/* Desktop: Eastern background photo */}
        <div 
          className="absolute inset-0 transition-opacity duration-700 ease-in-out bg-cover bg-center bg-no-repeat bg-fixed hidden md:block"
          style={{ 
            backgroundImage: `url(/images/hero-bg-eastern.webp)`,
            opacity: isLunaBg ? 0 : 1
          }} 
        />
        {/* Mobile: Gradient background */}
        <div 
          className="absolute inset-0 block md:hidden transition-opacity duration-700 ease-in-out"
          style={{ 
            background: isLunaBg 
              ? 'radial-gradient(ellipse at 30% 20%, #1a0a3a 0%, #0d0618 50%, #050510 100%)'
              : 'radial-gradient(ellipse at 70% 20%, #1a0a2e 0%, #0d0618 50%, #050510 100%)',
            opacity: 1
          }} 
        />
      </div>
      <div className="relative z-10">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-sw-accent flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-serif font-bold text-white">{t('brand')}</span>
              <span className="text-sm text-white/70 hidden sm:inline">| {isZh ? '在线咨询平台' : 'Online Divination Platform'}</span>
            </Link>

            {/* Desktop Nav - empty */}
            <div className="hidden md:flex items-center space-x-8">
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-3">
              {/* Desktop language switcher */}
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              
              {/* Mobile language switcher — shown only on mobile */}
              <div className="sm:hidden">
                <LanguageSwitcher />
              </div>
              
              {user ? (
                <Link 
                  href={user?.email ? getDashboardRoute(user.email) : '/auth/login'}
                  className="text-sm text-white/80 hover:text-white truncate max-w-[160px]"
                  title={user?.email || ''}
                >
                  {user?.email || ''}
                </Link>
              ) : (
                <Button 
                  size="sm" 
                  className="bg-stellawei-purple text-white hover:bg-stellawei-purple-dark rounded-full px-6"
                  onClick={() => router.push('/auth/login')}
                >
                  {isZh ? '登录' : 'Login'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-black p-6 shadow-xl">
            <div className="space-y-4">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-white">
                {isZh ? '首页' : 'Home'}
              </Link>
              <Link href="/booking" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-white">
                {isZh ? '预约' : 'Book Now'}
              </Link>
              <Link href="/masters" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-white">
                {isZh ? '师傅' : 'Masters'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Infinite Marquee — 热门问题滚动 */}
      <section className="relative overflow-hidden bg-black py-5 mt-16">
        {/* 左侧渐隐 */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-10" />
        {/* 右侧渐隐 */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-10" />
        
        <div className="flex animate-marquee-scroll whitespace-nowrap">
          {[...hotQuestions, ...hotQuestions, ...hotQuestions].map((q, idx) => (
            <div 
              key={idx} 
              className="inline-flex items-center gap-2 mx-6 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm"
            >
              <q.icon className="w-4 h-4 text-stellawei-gold" />
              <span>{isZh ? q.textZh : q.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Active Booking Banner */}
      <div className="pt-4">
        <ActiveBookingBanner isZh={isZh} />
      </div>

      {/* Hero Section */}
      <section className="pt-8 pb-12 lg:pt-16 lg:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-center">
            {/* Left: Text */}
            <div className="lg:flex-1 lg:min-w-0">
              {/* Mobile Master Images — Accordion (top on mobile) */}
              <div className="lg:hidden mb-6">
                <div className="flex gap-2 h-[260px]">
                  {masters.map((master, i) => {
                    const isActive = i === activeMasterIdx;
                    return (
                      <div
                        key={master.id}
                        onClick={() => setActiveMasterIdx(i)}
                        className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ease-out ${
                          isActive ? 'flex-[10]' : 'flex-[2]'
                        }`}
                        style={{ flex: isActive ? 10 : 2 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                        <img
                          src={master.image}
                          alt={isZh ? master.nameCn : master.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
                          <div className="text-white font-semibold text-sm">{isZh ? master.nameCn : master.name}</div>
                          <div className="text-white/80 text-xs">{isZh ? master.specialtyCn : master.specialty}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <h1 className="hidden lg:block text-3xl sm:text-5xl lg:text-6xl font-serif font-bold leading-[1.1] mb-4">
                {isZh ? (
                  <>
                    <span className="block safe-gradient-text">知命。</span>
                    <span className="block safe-gradient-text">借势。</span>
                    <span className="block safe-gradient-text">破局。</span>
                  </>
                ) : (
                  <>
                    <span className="block safe-gradient-text">Tell us less.</span>
                    <span className="block safe-gradient-text">We'll see more.</span>
                    <span className="block safe-gradient-text">Find clarity for what's next.</span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-lg text-white/90 mb-6 leading-relaxed whitespace-pre-line">
                {isZh 
                  ? '通过东方命理和西方塔罗与真人咨询，\n帮助你看清感情、事业与人生方向。'
                  : 'Discover clarity in love, career, and life through eastern wisdom,\nWestern Tarot, and real master consultations.'
                }
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Button 
                  size="lg" 
                  className="bg-[#6944b3] hover:bg-[#5a3a9e] text-white rounded-2xl px-8 h-16 text-lg font-semibold w-[85%] max-w-[420px] relative z-20 shadow-lg"
                  onClick={handleBookingClick}
                >
                  {isZh ? '开始首次咨询 $9.9' : 'Book Your First Reading From $9.9'}
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-col gap-2 text-sm text-white/90">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-sw-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{isZh ? '7天退款保障' : '7-Day Refund'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-sw-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>{isZh ? '真人咨询师傅' : 'Real Human Masters'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-sw-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>{isZh ? '100+真实评价来自美国、东京等海外华人用户' : '100+ reviews from overseas Chinese users'}</span>
                </div>
              </div>
            </div>

            {/* Right: Master Images — Accordion Click Switch */}
            <div className="hidden lg:flex lg:flex-[1.5] gap-6 h-[560px]">
              {masters.map((master, i) => {
                const isActive = i === activeMasterIdx;
                return (
                  <div
                    key={master.id}
                    onClick={() => setActiveMasterIdx(i)}
                    className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ease-out ${
                      isActive ? 'flex-[18]' : 'flex-[6]'
                    }`}
                    style={{ flex: isActive ? 18 : 6 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                    <img
                      src={master.image}
                      alt={isZh ? master.nameCn : master.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                      <div className="text-white font-semibold text-base">{isZh ? master.nameCn : master.name}</div>
                      <div className="text-white/80 text-sm">{isZh ? master.specialtyCn : master.specialty}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>


      {/* Testimonials */}
      <div id="testimonials">
        <Testimonials />
      </div>

      {/* Masters Section */}
      <section id="masters" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
              {isZh ? '认识我们的师傅' : 'Meet Our Masters'}
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              {isZh 
                ? '所有师傅均经过严格审核，拥有认证资质和多年经验'
                : 'All masters are carefully vetted with verified credentials and years of experience'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {masters.map((master) => (
              <div key={master.id} className="group">
                <div className="relative rounded-2xl overflow-hidden aspect-[4/5] mb-6">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                  <img 
                    src={master.image} 
                    alt={isZh ? master.nameCn : master.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                  />
                  <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 text-sw-gold fill-sw-gold" />
                    <span className="text-sm font-semibold">{master.rating}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                    <h3 className="text-white text-xl font-semibold mb-1">{isZh ? master.nameCn : master.name}</h3>
                    <p className="text-white/80 text-sm">{isZh ? master.specialtyCn : master.specialty}</p>
                  </div>
                </div>
                <div className="px-2">
                  <div className="flex items-center gap-4 text-sm text-white mb-3">
                    <span>{isZh ? master.experienceCn : master.experience}</span>
                    <span>·</span>
                    <span>{master.reviews} {isZh ? '条评价' : 'reviews'}</span>
                  </div>
                  <p className="text-sm text-white line-clamp-2">
                    {isZh ? master.taglineCn : master.tagline}
                  </p>
                  <Link href={`/masters/${master.id}`} className="inline-block mt-4">
                    <Button variant="outline" size="sm" className="rounded-full bg-stellawei-purple text-white/80 border-stellawei-purple hover:bg-stellawei-purple-dark">
                      {isZh ? '查看资料' : 'View Profile'}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
              {isZh ? '我们的服务' : 'Our Services'}
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              {isZh 
                ? '从灵性指导服务中选择，全部采用透明的固定价格'
                : 'Choose from our spiritual guidance services, all with transparent fixed pricing'}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="group hover:shadow-lg transition-shadow rounded-2xl overflow-hidden border-white/10 bg-black/70">
                <CardContent className="p-6 sm:p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <service.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-white mb-3">
                    {t(service.nameKey)}
                  </h3>
                  <p className="text-white/70 text-sm mb-6">
                    {t(service.descriptionKey)}
                  </p>
                  <div className="flex justify-end">
                    <Link href={service.id === 'eastern' ? '/services/bazi' : `/services/${service.id}`}>
                      <Button variant="outline" size="sm" className="rounded-full bg-stellawei-purple text-white/80 border-stellawei-purple hover:bg-stellawei-purple-dark">
                        {isZh ? '了解更多' : 'Learn More'}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-black/70 backdrop-blur-sm rounded-3xl p-8 sm:p-12 lg:p-16 text-white border border-white/10">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">
                {isZh ? '为什么信任 Stellawei？' : 'Why Trust Stellawei?'}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { 
                  icon: User, 
                  title: isZh ? '真人服务' : 'Real Human Masters',
                  desc: isZh ? '真人师傅一对一咨询，拒绝AI生成' : 'Every reading delivered by a real person, not AI'
                },
                { 
                  icon: Shield, 
                  title: isZh ? '隐私保护' : 'Privacy Protected',
                  desc: isZh ? '所有咨询内容严格保密' : 'All consultations are strictly confidential'
                },
                { 
                  icon: Star, 
                  title: isZh ? '7天退款' : '7-Day Refund',
                  desc: isZh ? '咨询开始前随时取消，全额退款' : 'Full refund before session starts'
                },
                { 
                  icon: Users, 
                  title: isZh ? '认证师傅' : 'Verified Masters',
                  desc: isZh ? '所有师傅均持有5年以上认证' : 'All certified with 5+ years experience'
                },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-sw-gold" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-white/70">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-6">
            {isZh ? '准备好开始你的旅程了吗？' : 'Ready to Start Your Journey?'}
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-[#6a45b9] text-white hover:bg-[#5a3ba0] rounded-full px-10 h-14 text-base"
              onClick={handleBookingClick}
            >
              {isZh ? '首次咨询仅需 $9.9' : 'Get Your First Reading – $9.9'}
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="rounded-full px-10 h-14 text-base border-2 border-stellawei-purple text-stellawei-purple !bg-black/70 hover:bg-stellawei-purple/10"
              onClick={() => {
                const servicesSection = document.getElementById('services');
                if (servicesSection) {
                  servicesSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              {isZh ? '浏览服务' : 'Browse Services'}
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-sw-accent flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-serif font-bold">{t('brand')}</span>
              </div>
              <p className="text-white/60 text-sm">
                {isZh ? '您值得信赖的灵性指导伙伴' : 'Your trusted companion for spiritual guidance'}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-sm">{isZh ? '服务' : 'Services'}</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="/services/tarot" className="hover:text-white">{t('services.tarot.name')}</a></li>
                <li><a href="/services/bazi" className="hover:text-white">{t('services.eastern.name')}</a></li>
                <li><a href="/services/spiritual" className="hover:text-white">{t('services.spiritual.name')}</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-sm">{isZh ? '支持' : 'Support'}</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><a href="/help" className="hover:text-white">{isZh ? '帮助中心' : 'Help Center'}</a></li>
                <li><a href="/refund-policy" className="hover:text-white">{isZh ? '退款政策' : 'Refund Policy'}</a></li>
                <li><a href="/privacy" className="hover:text-white">{isZh ? '隐私政策' : 'Privacy'}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">{isZh ? '公司' : 'Company'}</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><span className="hover:text-white cursor-default">{isZh ? '关于我们' : 'About Us'}</span></li>
                <li><span className="hover:text-white cursor-default">{isZh ? '联系我们' : 'Contact'}</span></li>
                <li><a href="mailto:support@stellawei.org" className="hover:text-white/80 text-xs">support@stellawei.org</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 text-center text-sm text-white/40">
            <p>© 2026 Stellawei. {isZh ? '保留所有权利' : 'All rights reserved'}</p>
          </div>
        </div>
      </footer>
    </div>
  </div>
  )
}
