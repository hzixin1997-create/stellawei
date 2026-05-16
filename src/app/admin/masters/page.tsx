'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ShoppingBag, Clock, Star, CheckCircle, Home, Loader2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { createClient } from '@/lib/supabase/client';

interface MasterStat {
  id: string;
  name: string;
  nameEn: string;
  email: string;
  specialty: string;
  specialtyEn: string;
  totalOrders: number;
  monthOrders: number;
  revenue: number;
  platformRevenue: number;
  isOnline: boolean;
}

interface StatsData {
  masterStats: MasterStat[];
}

export default function MastersManagement() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [masterList, setMasterList] = useState<MasterStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/stats', {
          headers: { authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();

        if (res.ok && data.masterStats) {
          setMasterList(data.masterStats);
        }
      } catch (err) {
        console.error('Fetch master stats error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const toggleStatus = (id: string) => {
    setMasterList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isOnline: !m.isOnline } : m))
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center text-stone-600 hover:text-stone-900 gap-2"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">
              {isZh ? '返回首页' : 'Back to Home'}
            </span>
          </Link>
          <h1 className="text-lg font-bold text-stone-900">
            {isZh ? '师傅管理' : 'Master Management'}
          </h1>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* 师傅卡片 */}
        <div className="space-y-6">
          {masterList.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500">{isZh ? '暂无师傅数据' : 'No master data yet'}</p>
            </div>
          ) : (
            masterList.map((master) => (
              <Card key={master.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                        {master.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold">{isZh ? master.name : master.nameEn}</h2>
                          <Badge
                            variant={master.isOnline ? 'default' : 'secondary'}
                          >
                            {master.isOnline
                              ? isZh
                                ? '🟢 在线'
                                : '🟢 Online'
                              : isZh
                                ? '⚪ 离线'
                                : '⚪ Offline'}
                          </Badge>
                        </div>
                        <p className="text-sm text-stone-500">
                          {isZh ? master.specialty : master.specialtyEn}
                        </p>
                        <p className="text-xs text-stone-400">{master.email}</p>
                      </div>
                    </div>
                    <Button
                      variant={master.isOnline ? 'outline' : 'default'}
                      onClick={() => toggleStatus(master.id)}
                    >
                      {master.isOnline
                        ? isZh
                          ? '下线'
                          : 'Go Offline'
                        : isZh
                          ? '上线'
                          : 'Go Online'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-stone-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-stone-500 mb-1">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-sm">
                          {isZh ? '总订单' : 'Total Orders'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{master.totalOrders}</p>
                    </div>

                    <div className="bg-stone-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-stone-500 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-sm">
                          {isZh ? '本月订单' : 'This Month'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold">{master.monthOrders}</p>
                    </div>

                    <div className="bg-stone-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-stone-500 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {isZh ? '师傅收入(70%)' : 'Revenue (70%)'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-violet-600">${master.revenue.toFixed(2)}</p>
                    </div>

                    <div className="bg-stone-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-stone-500 mb-1">
                        <Star className="w-4 h-4" />
                        <span className="text-sm">
                          {isZh ? '平台抽成(30%)' : 'Platform (30%)'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-stone-600">${master.platformRevenue.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-stone-600">
                        {isZh ? '累计收入（含平台抽成）' : 'Total Revenue (incl. platform)'}
                      </span>
                    </div>
                    <span className="text-xl font-bold text-violet-600">
                      ${(master.revenue + master.platformRevenue).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
