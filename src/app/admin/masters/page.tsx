'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, ShoppingBag, Clock, Star, CheckCircle, Home } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// 师傅数据
const masters = [
  {
    id: 'zhang-yihua',
    name: '张易桦',
    nameEn: 'Master Zhang Yihua',
    email: 'qimenyihua@gmail.com',
    specialty: '奇门遁甲',
    specialtyEn: 'Qi Men Dun Jia',
    totalOrders: 0,
    monthOrders: 0,
    avgReplyTime: '-',
    revenue: 0,
    rating: '-',
    isOnline: true,
  },
  {
    id: 'wu-yang',
    name: '戊阳',
    nameEn: 'Master Wu Yang',
    email: 'mshoucangjia@gmail.com',
    specialty: '八字命理 · 风水',
    specialtyEn: 'BaZi & Feng Shui',
    totalOrders: 0,
    monthOrders: 0,
    avgReplyTime: '-',
    revenue: 0,
    rating: '-',
    isOnline: true,
  },
];

export default function MastersManagement() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [masterList, setMasterList] = useState(masters);

  const toggleStatus = (id: string) => {
    setMasterList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isOnline: !m.isOnline } : m))
    );
  };

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
          {masterList.map((master) => (
            <Card key={master.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                      {master.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>
                          {isZh ? master.name : master.nameEn}
                        </CardTitle>
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
                        {isZh ? '平均回复' : 'Avg Reply'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold">{master.avgReplyTime}</p>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-stone-500 mb-1">
                      <Star className="w-4 h-4" />
                      <span className="text-sm">
                        {isZh ? '评分' : 'Rating'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold">{master.rating}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-stone-600">
                      {isZh ? '累计收入' : 'Total Revenue'}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-violet-600">
                    ${master.revenue}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
