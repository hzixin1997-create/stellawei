'use client';

import { useState, useEffect } from "react";
import { masters } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, CheckCircle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const specialtyLabels: Record<string, string> = {
  tarot: "Tarot",
  astrology: "Astrology",
  bazi: "Bazi / 八字命理",
  fengshui: "Feng Shui / 风水",
  qimen: "Qi Men Dun Jia / 奇门遁甲",
  liuyao: "Liu Yao / 六爻占卜",
}

const statusConfig: Record<string, { label: string; labelEn: string; color: string }> = {
  online: { label: '在线', labelEn: 'Online', color: 'bg-green-100 text-green-700 border-green-200' },
  offline: { label: '离线', labelEn: 'Offline', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  rest: { label: '休息中', labelEn: 'Resting', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

export default function MastersPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';
  const [masterStatuses, setMasterStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const res = await fetch('/api/masters');
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, string> = {};
          (data.masters || []).forEach((m: any) => {
            map[m.id] = m.status || 'online';
          });
          setMasterStatuses(map);
        }
      } catch (err) {
        console.error('Failed to load master statuses:', err);
      }
    };
    loadStatuses();
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-md border-b border-stellawei-purple/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stellawei-purple to-stellawei-gold"></div>
              <span className="text-xl font-serif font-bold text-stellawei-purple">{t('brand')}</span>
            </Link>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Link href="/services">
                <Button variant="outline" size="sm">View Services</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center space-x-2 bg-stellawei-purple/10 text-stellawei-purple px-4 py-2 rounded-full text-sm font-medium mb-6">
              <CheckCircle className="w-4 h-4" />
              <span>All Masters Verified & Certified</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t('masters.title')}</h1>
            <p className="text-lg text-muted-foreground">
              {t('masters.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Masters Grid */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {masters.map((master) => {
              const status = masterStatuses[master.id] || 'online';
              const statusInfo = statusConfig[status] || statusConfig.online;
              return (
                <Link key={master.id} href={`/masters/${master.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group h-full">
                    <div className="aspect-square bg-gradient-to-br from-stellawei-purple/20 to-stellawei-gold/20 relative">
                      <img
                        src={master.avatar_url}
                        alt={master.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      
                      <div className="absolute top-4 right-4 flex gap-2">
                        <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1">
                          <Star className="w-4 h-4 text-stellawei-gold fill-stellawei-gold" />
                          <span className="text-sm font-semibold">{master.rating_average}</span>
                        </div>
                        <Badge variant="outline" className={`bg-white/90 backdrop-blur-sm ${statusInfo.color}`}>
                          {currentLang === 'zh' ? statusInfo.label : statusInfo.labelEn}
                        </Badge>
                      </div>
                      
                      {master.is_verified && (
                        <div className="absolute bottom-4 left-4 bg-stellawei-gold text-stellawei-purple-dark px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>{t('masters.verified')}</span>
                        </div>
                      )}
                    </div>
                    
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">{master.display_name}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground italic line-clamp-1">"{master.tagline}"</p>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {master.specialties.map(specialty => (
                          <Badge key={specialty} variant="secondary" className="text-xs">
                            {specialtyLabels[specialty] || specialty}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{master.experience_years}+ years</span>
                        </div>
                        
                        <span className="text-muted-foreground">{master.rating_count} {t('masters.reviews')}</span>
                      </div>
                      
                      
                      <div className="pt-2">
                        <Button variant="outline" className="w-full group-hover:bg-stellawei-purple group-hover:text-white transition-colors">
                          {t('masters.viewProfile')}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
