'use client';

import Image from 'next/image'
import { useEffect, useState } from "react"
import { reviews as mockReviews } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

interface MasterService {
  id: string;
  name: string;
  type: 'booking' | 'message';
  price: number;
  currency: string;
  duration_minutes?: number;
  response_hours: number;
  description?: string;
}

interface Master {
  id: string;
  user_id: string;
  display_name: string;
  display_nameCn?: string;
  tagline: string;
  taglineCn?: string;
  bio: string;
  bioCn?: string;
  avatar_url: string;
  specialties: string[];
  specialtiesCn?: string[];
  languages: string[];
  experience_years: number;
  certifications: { name: string; issuer: string; year: number }[];
  is_verified: boolean;
  rating_average: number;
  rating_count: number;
  completed_sessions: number;
}

interface Props {
  master: Master;
}

export function ClientMasterContent({ master }: Props) {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language || 'en';
  
  const [services, setServices] = useState<MasterService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [masterStatus, setMasterStatus] = useState<string>('online');
  const [masterReviews, setMasterReviews] = useState<any[]>([]);

  // 发送 view_master 事件
  useEffect(() => {
    track.viewMaster({
      master_name: master.display_name,
      master_type: master.specialties?.[0] || 'general',
    });
  }, [master.display_name, master.specialties]);

  // 用户名隐私处理
  function maskName(name: string): string {
    if (!name) return 'A**B';
    if (name === '洛桑') return 'Lisa';
    if (name.length <= 2) return name[0] + '**';
    return name[0] + '**' + name[name.length - 1];
  }

  // 语言显示
  function displayLanguage(lang: string): string {
    const map: Record<string, string> = {
      'en': 'English',
      'zh': 'Chinese',
    };
    return map[lang] || lang;
  }

  const specialtyLabels: Record<string, string> = {
    tarot: "Tarot Reading",
    astrology: "Astrology",
    bazi: "Bazi (Four Pillars)",
    fengshui: "Feng Shui",
    qimen: "Qi Men Dun Jia",
    liuyao: "Liu Yao Divination",
    spiritual: "Spiritual Exploration",
  }

  const specialtyLabelsCn: Record<string, string> = {
    tarot: "塔罗解读",
    astrology: "占星",
    bazi: "八字命理",
    fengshui: "风水",
    qimen: "奇门遁甲",
    liuyao: "六爻占卜",
    spiritual: "灵性探索",
  }

  async function loadServices() {
    try {
      const res = await fetch(`/api/masters/${master.id}/services`);
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
      }
    } catch (err) {
      console.error("Failed to load services:", err);
    } finally {
      setLoadingServices(false);
    }
  }

  async function loadMasterStatus() {
    try {
      // AI师傅固定显示休息中
      const aiMasterIds = ['master-lin', 'master-han', 'master-elena'];
      if (aiMasterIds.includes(master.id)) {
        setMasterStatus('rest');
        return;
      }
      
      // 通过 /api/masters 获取所有师傅状态
      const res = await fetch('/api/masters');
      if (res.ok) {
        const data = await res.json();
        const found = (data.masters || []).find((m: any) => m.id === master.id);
        if (found) {
          setMasterStatus(found.status || 'online');
        }
      }
    } catch (err) {
      console.error("Failed to load master status:", err);
    }
  }

  useEffect(() => {
    loadServices();
    loadMasterStatus();
    // 评价直接写死，不通过API加载
    setMasterReviews(mockReviews.filter((r: any) => r.master_id === master.id));
  }, [master.id]);



  // 根据当前语言选择显示内容
  const displayName = currentLang === 'zh' && master.display_nameCn ? master.display_nameCn : master.display_name;
  const tagline = currentLang === 'zh' && master.taglineCn ? master.taglineCn : master.tagline;
  const bio = currentLang === 'zh' && master.bioCn ? master.bioCn : master.bio;
  const specialties = currentLang === 'zh' 
    ? (master.specialtiesCn || master.specialties.map(s => specialtyLabelsCn[s] || specialtyLabels[s] || s))
    : master.specialties.map(s => specialtyLabels[s] || s);

  // 标签翻译
  const labels = {
    experience: currentLang === 'zh' ? '经验' : 'Experience',
    sessions: currentLang === 'zh' ? '服务次数' : 'Sessions',
    languages: currentLang === 'zh' ? '语言' : 'Languages',
    about: currentLang === 'zh' ? '关于' : 'About',
    specialties: currentLang === 'zh' ? '专长' : 'Specialties',
    certifications: currentLang === 'zh' ? '认证' : 'Certifications',
    services: currentLang === 'zh' ? '服务' : 'Services',
    bookNow: currentLang === 'zh' ? '立即预约' : 'Book Now',
    leaveMessage: currentLang === 'zh' ? '留言咨询' : 'Leave Message',
    reviews: currentLang === 'zh' ? '评价' : 'Reviews',
    verified: currentLang === 'zh' ? '已认证' : 'Verified',
    viewServices: currentLang === 'zh' ? '查看服务' : 'View Services',
    years: currentLang === 'zh' ? '年' : 'years',
    min: currentLang === 'zh' ? '分钟' : 'min',
    hours: currentLang === 'zh' ? '小时回复' : 'h response',
    loginRequired: currentLang === 'zh' ? '请先登录' : 'Please sign in first',
  }

  const statusConfig: Record<string, { label: string; labelEn: string; color: string }> = {
    online: { label: '在线', labelEn: 'Online', color: 'bg-green-100 text-green-700 border-green-200' },
    offline: { label: '离线', labelEn: 'Offline', color: 'bg-gray-100 text-gray-600 border-gray-200' },
    rest: { label: '休息中', labelEn: 'Resting', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  };

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(ellipse at 70% 20%, #1a0a2e 0%, #0d0618 50%, #050510 100%)'
    }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-sw-accent flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-serif font-bold text-white">{t('brand')}</span>
            </Link>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href="/">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">{currentLang === 'zh' ? '返回主页' : 'Home'}</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Profile */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 bg-black/70 border-white/10 text-white">
                <div className="aspect-square bg-gradient-to-br from-stellawei-purple/20 to-stellawei-gold/20 relative">
                  <Image
                    src={master.avatar_url}
                    alt={displayName}
                    fill
                    className="object-cover"
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                  {master.is_verified && (
                    <div className="absolute top-4 right-4 bg-stellawei-gold text-stellawei-purple-dark px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{labels.verified}</span>
                    </div>
                  )}
                </div>
                
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-serif text-white">{displayName}</CardTitle>
                    <Badge variant="outline" className={`text-xs border-white/20 text-white ${statusConfig[masterStatus]?.color || statusConfig.online.color}`}>
                      {currentLang === 'zh' 
                        ? (statusConfig[masterStatus]?.label || statusConfig.online.label)
                        : (statusConfig[masterStatus]?.labelEn || statusConfig.online.labelEn)
                      }
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-stellawei-gold fill-stellawei-gold" />
                    <span className="font-semibold text-white">{master.rating_average}</span>
                    <span className="text-white/70 text-sm">({master.rating_count})</span>
                  </div>
                  
                  <p className="text-sm text-white/70 italic">"{tagline}"</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* 预约咨询按钮 */}
                  <Link 
                    href="/booking"
                    onClick={() => {
                      track.selectMaster({
                        master_name: master.display_name,
                        master_id: master.id,
                        service_type: master.specialties?.[0] || 'general',
                      });
                    }}
                  >
                    <Button className="w-full bg-stellawei-purple hover:bg-stellawei-purple-dark" size="lg">
                      {currentLang === 'zh' ? '预约咨询' : 'Book Consultation'}
                    </Button>
                  </Link>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{labels.experience}</span>
                    <span className="font-medium text-white">{master.experience_years}+ {labels.years}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{labels.sessions}</span>
                    <span className="font-medium text-white">{master.completed_sessions}+</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{labels.languages}</span>
                    <div className="flex space-x-1">
                      {master.languages.map(lang => (
                        <Badge key={lang} variant="secondary" className="text-xs bg-white/10 text-white border-white/10">
                          {displayLanguage(lang)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <Card className="bg-black/70 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="font-serif text-white">{labels.about}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/80 leading-relaxed">{bio}</p>
                </CardContent>
              </Card>

              {/* Specialties */}
              <Card className="bg-black/70 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="font-serif text-white">{labels.specialties}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(specialties) ? specialties.map((specialty, index) => (
                      <Badge key={index} className="bg-stellawei-purple/20 text-white border-white/10 hover:bg-stellawei-purple/30">
                        {specialty}
                      </Badge>
                    )) : master.specialties.map(specialty => (
                      <Badge key={specialty} className="bg-stellawei-purple/20 text-white border-white/10 hover:bg-stellawei-purple/30">
                        {specialtyLabels[specialty] || specialty}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Reviews */}
              <Card className="bg-black/70 border-white/10 text-white">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-white">{labels.reviews}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 text-stellawei-gold fill-stellawei-gold" />
                      <span className="font-bold text-white">{master.rating_average}</span>
                      <span className="text-white/70">({master.rating_count} {currentLang === 'zh' ? '条评价' : 'reviews'})</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {masterReviews.length > 0 ? (
                      masterReviews.map(review => (
                        <div key={review.id} className="border-b border-white/10 last:border-0 pb-4 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-stellawei-purple/20 flex items-center justify-center text-sm font-medium text-white">
                                {(review.user?.full_name || 'A').charAt(0)}
                              </div>
                              <span className="font-medium text-white">{maskName(review.user?.full_name || (currentLang === 'zh' ? '匿名用户' : 'Anonymous'))}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < review.overall_rating ? 'text-stellawei-gold fill-stellawei-gold' : 'text-white/20'}`}
                                />
                              ))}
                            </div>
                          </div>
                          
                          <p className="font-medium mb-1 text-white">{review.title}</p>
                          <p className="text-sm text-white/70">{review.content}</p>
                          
                          <p className="text-xs text-white/50 mt-2">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/70 text-center py-8">{currentLang === 'zh' ? '暂无评价' : 'No reviews yet'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}