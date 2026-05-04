'use client';

import { useState } from 'react';
import {
  Users,
  ShoppingBag,
  Clock,
  DollarSign,
  Star,
  ToggleLeft,
  ToggleRight,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/* ── Mock Data ─────────────────────────────── */

interface MasterData {
  id: string;
  name: string;
  slug: string;
  avatar: string;
  specialties: string[];
  totalOrders: number;
  monthOrders: number;
  avgReplyHours: number;
  totalIncome: number;
  monthIncome: number;
  rating: number;
  online: boolean;
}

const masters: MasterData[] = [
  {
    id: 'm1',
    name: '张易桦',
    slug: 'zhang-yihua',
    avatar: '/avatars/zhang-yihua.jpg',
    specialties: ['奇门遁甲', '六爻占卜', '塔罗'],
    totalOrders: 128,
    monthOrders: 12,
    avgReplyHours: 2.3,
    totalIncome: 38400,
    monthIncome: 3600,
    rating: 4.8,
    online: true,
  },
  {
    id: 'm2',
    name: '戊阳',
    slug: 'wu-yang',
    avatar: '/avatars/wu-yang.jpg',
    specialties: ['八字命盘', '风水调理', '紫微斗数'],
    totalOrders: 96,
    monthOrders: 8,
    avgReplyHours: 3.1,
    totalIncome: 48000,
    monthIncome: 3200,
    rating: 4.6,
    online: true,
  },
];

/* ── Page ──────────────────────────────────── */

export default function AdminMasters() {
  const [masterList, setMasterList] = useState(masters);

  const toggleOnline = (id: string) => {
    setMasterList((prev) =>
      prev.map((m) => (m.id === id ? { ...m, online: !m.online } : m))
    );
  };

  const totalOrdersAll = masterList.reduce((s, m) => s + m.totalOrders, 0);
  const totalIncomeAll = masterList.reduce((s, m) => s + m.totalIncome, 0);
  const onlineCount = masterList.filter((m) => m.online).length;

  return (
    <div className="space-y-8">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="师傅总数"
          value={masterList.length}
          icon={Users}
          accent="text-stellawei-purple"
          bg="bg-stellawei-purple/10"
        />
        <StatCard
          title="在线师傅"
          value={onlineCount}
          icon={Sparkles}
          accent="text-green-600"
          bg="bg-green-100"
        />
        <StatCard
          title="累计订单"
          value={totalOrdersAll}
          icon={ShoppingBag}
          accent="text-blue-600"
          bg="bg-blue-100"
        />
        <StatCard
          title="累计收入"
          value={`$${totalIncomeAll.toLocaleString()}`}
          icon={DollarSign}
          accent="text-amber-600"
          bg="bg-amber-100"
        />
      </div>

      {/* 师傅列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {masterList.map((master) => (
          <Card key={master.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* 顶部信息 */}
              <div className="p-6 flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0">
                  <Crown size={28} className="text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-stone-800">
                        {master.name}
                      </h3>
                      <Badge
                        className={
                          master.online
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }
                      >
                        {master.online ? '在线' : '离线'}
                      </Badge>
                    </div>
                    <button
                      onClick={() => toggleOnline(master.id)}
                      className="text-stone-400 hover:text-stellawei-purple transition-colors"
                      title={master.online ? '点击下线' : '点击上线'}
                    >
                      {master.online ? (
                        <ToggleRight size={28} className="text-green-600" />
                      ) : (
                        <ToggleLeft size={28} />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {master.specialties.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 text-xs rounded-md bg-stone-100 text-stone-600"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-sm text-stone-500">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    <span>{master.rating} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* 数据网格 */}
              <div className="grid grid-cols-2 border-t border-stone-100">
                <div className="p-4 border-r border-stone-100">
                  <div className="text-xs text-stone-500 mb-1">订单总量</div>
                  <div className="text-xl font-bold text-stone-800">
                    {master.totalOrders}
                  </div>
                  <div className="text-xs text-stone-400 mt-1">
                    本月 +{master.monthOrders}
                  </div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-stone-500 mb-1">平均回复</div>
                  <div className="text-xl font-bold text-stone-800 flex items-center gap-1">
                    <Clock size={18} className="text-stone-400" />
                    {master.avgReplyHours}h
                  </div>
                  <div className="text-xs text-stone-400 mt-1">24h 内优先</div>
                </div>
                <div className="p-4 border-t border-r border-stone-100">
                  <div className="text-xs text-stone-500 mb-1">总收入</div>
                  <div className="text-xl font-bold text-stone-800">
                    ${master.totalIncome.toLocaleString()}
                  </div>
                  <div className="text-xs text-stone-400 mt-1">
                    本月 +${master.monthIncome.toLocaleString()}
                  </div>
                </div>
                <div className="p-4 border-t border-stone-100">
                  <div className="text-xs text-stone-500 mb-1">转化率</div>
                  <div className="text-xl font-bold text-stone-800">
                    {((master.totalOrders / 200) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-stone-400 mt-1">目标 200 单</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  accent,
  bg,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-stone-500">{title}</span>
          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon size={18} className={accent} />
          </div>
        </div>
        <div className="text-2xl font-bold text-stone-800">{value}</div>
      </CardContent>
    </Card>
  );
}
