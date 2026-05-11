'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Filter,
  ShoppingBag,
  Home,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function AdminOrders() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [query, setQuery] = useState('');
  const [masterFilter, setMasterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-stone-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center text-stone-600 hover:text-stone-900 gap-2">
            <Home className="w-5 h-5" />
            <span className="font-medium">{isZh ? '返回首页' : 'Back to Home'}</span>
          </Link>
          <h1 className="text-lg font-bold text-stone-900">{isZh ? '订单管理' : 'Order Management'}</h1>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 筛选栏 */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder={isZh ? '搜索订单ID或用户邮箱...' : 'Search order ID or user email...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-stone-50 border-stone-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-stone-400" />
              <select
                value={masterFilter}
                onChange={(e) => setMasterFilter(e.target.value)}
                className="text-sm border border-stone-200 rounded-md px-3 py-2 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="all">{isZh ? '全部师傅' : 'All Masters'}</option>
                <option value="zhang-yihua">{isZh ? '张易桦' : 'Master Zhang'}</option>
                <option value="wu-yang">{isZh ? '戊阳' : 'Master Wu'}</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-stone-200 rounded-md px-3 py-2 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="all">{isZh ? '全部状态' : 'All Status'}</option>
                <option value="pending">{isZh ? '待付款' : 'Pending'}</option>
                <option value="paid">{isZh ? '已付款' : 'Paid'}</option>
                <option value="in_progress">{isZh ? '服务中' : 'In Progress'}</option>
                <option value="completed">{isZh ? '已完成' : 'Completed'}</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* 订单列表 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sans font-semibold">
              {isZh ? '订单列表' : 'Orders'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-16">
              <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500 text-lg mb-2">{isZh ? '暂无订单' : 'No orders yet'}</p>
              <p className="text-sm text-stone-400">
                {isZh ? '网站上线后订单将显示在这里' : 'Orders will appear here after launch'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
