'use client';

import { useEffect, useState } from "react"
import { reviews as mockReviews } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Award, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";

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
  const [creatingOrder, setCreatingOrder] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [masterStatus, setMasterStatus] = useState<string>('online');
  const [masterReviews, setMasterReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

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

  async function createOrder(serviceId: string) {
    setCreatingOrder(serviceId);
    setAuthError(false);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthError(true);
        setCreatingOrder(null);
        return;
      }

      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          master_id: master.id,
          master_service_id: serviceId,
          type: service.type,
        }),
      });

      const data = await res.json();

      if (data.success && data.checkoutUrl) {
        // 跳转到 Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else if (data.error) {
        alert(data.error);
        setCreatingOrder(null);
      }
    } catch (err) {
      console.error("Create order error:", err);
      alert("创建订单失败，请重试");
      setCreatingOrder(null);
    }
  }

  useEffect(() => {
    loadServices();
    loadMasterStatus();
    loadReviews();
  }, [master.id]);

  async function loadReviews() {
    try {
      const res = await fetch(`/api/masters/${master.id}/reviews`);
      const data = await res.json();
      const apiReviews = data.reviews || [];
      
      // 合并 API 真实评价 + 硬编码展示数据（仅当 API 无数据时作为兜底）
      const fallbackReviews = mockReviews.filter((r: any) => r.master_id === master.id);
      
      // 标准化评价数据格式（API 返回 rating/content/user[]，mock 返回 overall_rating/title/content）
      const normalizedApi = apiReviews.map((r: any) => ({
        ...r,
        overall_rating: r.rating || r.overall_rating,
        title: r.title || '',
        content: r.content || r.review || '',
        user: Array.isArray(r.user) && r.user.length > 0
          ? r.user[0]
          : (r.user || { full_name: 'Anonymous' }),
      }));
      
      if (normalizedApi.length > 0) {
        const apiIds = new Set(normalizedApi.map((r: any) => r.id));
        const merged = [...normalizedApi, ...fallbackReviews.filter((r: any) => !apiIds.has(r.id))];
        setMasterReviews(merged);
      } else {
        setMasterReviews(fallbackReviews);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
      setMasterReviews(mockReviews.filter((r: any) => r.master_id === master.id));
    } finally {
      setLoadingReviews(false);
    }
  }

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
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-stellawei-purple/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stellawei-purple to-stellawei-gold"></div>
              <span className="text-xl font-serif font-bold text-stellawei-purple">Stellawei</span>
            </Link>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href="/">
                <Button variant="outline" size="sm">{currentLang === 'zh' ? '返回主页' : 'Home'}</Button>
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
              <Card className="sticky top-24">
                <div className="aspect-square bg-gradient-to-br from-stellawei-purple/20 to-stellawei-gold/20 relative">
                  <img
                    src={master.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    loading="lazy"
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
                    <CardTitle className="font-serif">{displayName}</CardTitle>
                    <Badge variant="outline" className={`text-xs ${statusConfig[masterStatus]?.color || statusConfig.online.color}`}>
                      {currentLang === 'zh' 
                        ? (statusConfig[masterStatus]?.label || statusConfig.online.label)
                        : (statusConfig[masterStatus]?.labelEn || statusConfig.online.labelEn)
                      }
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-stellawei-gold fill-stellawei-gold" />
                    <span className="font-semibold">{master.rating_average}</span>
                    <span className="text-muted-foreground text-sm">({master.rating_count})</span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground italic">"{tagline}"</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* 预约咨询按钮 */}
                  <Link href="/booking">
                    <Button className="w-full" size="lg">
                      {currentLang === 'zh' ? '预约咨询' : 'Book Consultation'}
                    </Button>
                  </Link>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{labels.experience}</span>
                    <span className="font-medium">{master.experience_years}+ {labels.years}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{labels.sessions}</span>
                    <span className="font-medium">{master.completed_sessions}+</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{labels.languages}</span>
                    <div className="flex space-x-1">
                      {master.languages.map(lang => (
                        <Badge key={lang} variant="secondary" className="text-xs">
                          {lang.toUpperCase()}
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
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">{labels.about}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{bio}</p>
                </CardContent>
              </Card>

              {/* Specialties */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">{labels.specialties}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(specialties) ? specialties.map((specialty, index) => (
                      <Badge key={index} className="bg-stellawei-purple/10 text-stellawei-purple hover:bg-stellawei-purple/20">
                        {specialty}
                      </Badge>
                    )) : master.specialties.map(specialty => (
                      <Badge key={specialty} className="bg-stellawei-purple/10 text-stellawei-purple hover:bg-stellawei-purple/20">
                        {specialtyLabels[specialty] || specialty}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Certifications */}
              {master.certifications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-serif">{labels.certifications}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {master.certifications.map((cert, i) => (
                        <div key={i} className="flex items-start space-x-3">
                          <Award className="w-5 h-5 text-stellawei-gold mt-0.5" />
                          <div>
                            <p className="font-medium">{cert.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {cert.issuer} • {cert.year}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reviews */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif">{labels.reviews}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Star className="w-5 h-5 text-stellawei-gold fill-stellawei-gold" />
                      <span className="font-bold">{master.rating_average}</span>
                      <span className="text-muted-foreground">({master.rating_count} {currentLang === 'zh' ? '条评价' : 'reviews'})</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {masterReviews.length > 0 ? (
                      masterReviews.map(review => (
                        <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-stellawei-purple/20 flex items-center justify-center text-sm font-medium text-stellawei-purple">
                                {(review.user?.full_name || 'A').charAt(0)}
                              </div>
                              <span className="font-medium">{review.user?.full_name || (currentLang === 'zh' ? '匿名用户' : 'Anonymous')}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < review.overall_rating ? 'text-stellawei-gold fill-stellawei-gold' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          
                          <p className="font-medium mb-1">{review.title}</p>
                          <p className="text-sm text-muted-foreground">{review.content}</p>
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(review.created_at).toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">{currentLang === 'zh' ? '暂无评价' : 'No reviews yet'}</p>
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