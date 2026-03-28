'use client';

import { reviews, services } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Award, CheckCircle, Calendar } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

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
  
  const masterReviews = reviews.filter(r => r.master_id === master.id)
  const masterServices = services.filter(s => master.specialties.includes(s.type))
  
  const specialtyLabels: Record<string, string> = {
    tarot: "Tarot Reading",
    astrology: "Astrology",
    bazi: "Bazi (Four Pillars)",
    fengshui: "Feng Shui",
    qimen: "Qi Men Dun Jia",
    liuyao: "Liu Yao Divination",
  }

  const specialtyLabelsCn: Record<string, string> = {
    tarot: "塔罗解读",
    astrology: "占星",
    bazi: "八字命理",
    fengshui: "风水",
    qimen: "奇门遁甲",
    liuyao: "六爻占卜",
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
    services: currentLang === 'zh' ? '可预约服务' : 'Available Services',
    bookSession: currentLang === 'zh' ? '预约咨询' : 'Book Session',
    bookNow: currentLang === 'zh' ? '立即预约' : 'Book Now',
    reviews: currentLang === 'zh' ? '评价' : 'Reviews',
    verified: currentLang === 'zh' ? '已认证' : 'Verified',
    viewServices: currentLang === 'zh' ? '查看服务' : 'View Services',
    years: currentLang === 'zh' ? '年' : 'years',
  }

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
              <Link href="/services">
                <Button variant="outline" size="sm">{labels.viewServices}</Button>
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
                  />
                  {master.is_verified && (
                    <div className="absolute top-4 right-4 bg-stellawei-gold text-stellawei-purple-dark px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{labels.verified}</span>
                    </div>
                  )}
                </div>
                
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif">{displayName}</CardTitle>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-stellawei-gold fill-stellawei-gold" />
                      <span className="font-semibold">{master.rating_average}</span>
                      <span className="text-muted-foreground text-sm">({master.rating_count})</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground italic">"{tagline}"</p>
                </CardHeader>
                
                <CardContent className="space-y-4">
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
                  
                  <div className="pt-4 border-t">
                    <Button className="w-full">
                      <Calendar className="w-4 h-4 mr-2" />
                      {labels.bookSession}
                    </Button>
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

              {/* Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">{labels.services}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {masterServices.map(service => (
                      <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div>
                          <p className="font-medium">{currentLang === 'zh' && service.name_zh ? service.name_zh : service.name_en}</p>
                          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {service.duration_minutes} {currentLang === 'zh' ? '分钟' : 'min'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <p className="font-bold text-stellawei-purple">
                            ${service.price_min}
                            {service.price_max > service.price_min && `-${service.price_max}`}
                          </p>
                          <Button size="sm">{labels.bookNow}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

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