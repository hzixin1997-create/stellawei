'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag,
  MessageSquare,
  DollarSign,
  Users,
  Home,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [statusFilter, setStatusFilter] = useState('all');

  const todayOrders = 0;
  const pendingMessages = 0;
  const monthRevenue = 0;
  const activeMasters = 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-stone-600 hover:text-stone-900 gap-2">
            <Home className="w-5 h-5" />
            <span className="font-medium">{isZh ? '返回首页' : 'Back to Home'}</span>
          </Link>
          <h1 className="text-lg font-bold text-stone-900">{isZh ? '总裁后台' : 'Admin Dashboard'}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '今日订单' : 'Today Orders'}</p>
                  <p className="text-2xl font-bold">{todayOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '待处理留言' : 'Pending Messages'}</p>
                  <p className="text-2xl font-bold">{pendingMessages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '本月总收入' : 'Monthly Revenue'}</p>
                  <p className="text-2xl font-bold">${monthRevenue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-stone-500">{isZh ? '活跃师傅' : 'Active Masters'}</p>
                  <p className="text-2xl font-bold">{activeMasters}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 订单列表 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{isZh ? '订单管理' : 'Order Management'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500">{isZh ? '暂无订单' : 'No orders yet'}</p>
              <p className="text-sm text-stone-400 mt-1">{isZh ? '网站上线后订单将显示在这里' : 'Orders will appear here after launch'}</p>
            </div>
          </CardContent>
        </Card>

        {/* 师傅工作量 */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{isZh ? '张易桦' : 'Master Zhang Yihua'}</h3>
                <Badge variant="outline" className="text-green-600">{isZh ? '在线' : 'Online'}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">{isZh ? '订单总量' : 'Total Orders'}</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">{isZh ? '本月订单' : 'This Month'}</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">{isZh ? '平均回复时间' : 'Avg Reply Time'}</span>
                  <span>-</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{isZh ? '戊阳' : 'Master Wu Yang'}</h3>
                <Badge variant="outline" className="text-green-600">{isZh ? '在线' : 'Online'}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">{isZh ? '订单总量' : 'Total Orders'}</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">{isZh ? '本月订单' : 'This Month'}</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">{isZh ? '平均回复时间' : 'Avg Reply Time'}</span>
                  <span>-</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
