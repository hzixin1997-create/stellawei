"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from 'react-i18next';
import { Inbox, CheckCircle, Clock, AlertCircle, Settings, LogOut, Home } from "lucide-react";
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface Order {
  id: string;
  status: string;
  type: string;
  service_name: string;
  amount: number;
  currency: string;
  user_question?: string;
  master_response?: string;
  master_read: boolean;
  created_at: string;
  user: { full_name?: string; email?: string };
}

export default function MasterDashboard() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [masterName, setMasterName] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/master/login");
      return;
    }
    loadDashboard(session.access_token);
  }

  async function loadDashboard(token: string) {
    try {
      // 获取师傅信息
      const { data: master } = await supabase
        .from("masters")
        .select("display_name")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (master) setMasterName(master.display_name);

      // 获取订单统计
      const res = await fetch("/api/master/orders?limit=5", {
        headers: { authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.orders) {
        setRecentOrders(data.orders);
      }
      if (data.stats) {
        setStats({
          total: data.stats.total || 0,
          pending: data.stats.pending || 0,
          paid: data.stats.paid || 0,
          assigned: data.stats.assigned || 0,
          in_progress: data.stats["in_progress"] || 0,
          completed: data.stats.completed || 0,
        });
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/master/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">{isZh ? '加载中...' : 'Loading...'}</div>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: isZh ? "待付款" : "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    paid: { label: isZh ? "已付款" : "Paid", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
    assigned: { label: isZh ? "待回复" : "Assigned", color: "bg-orange-100 text-orange-800", icon: AlertCircle },
    "in_progress": { label: isZh ? "处理中" : "In Progress", color: "bg-purple-100 text-purple-800", icon: Clock },
    completed: { label: isZh ? "已完成" : "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle },
    cancelled: { label: isZh ? "已取消" : "Cancelled", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center text-stone-600 hover:text-stone-900 gap-2">
              <Home className="w-5 h-5" />
              <span className="font-medium">{isZh ? '返回首页' : 'Back to Home'}</span>
            </Link>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-stone-800">{isZh ? '师傅后台' : 'Master Dashboard'}</h1>
            <p className="text-sm text-stone-500">{masterName}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/master/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Settings size={16} />
              {isZh ? '设置' : 'Settings'}
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              {isZh ? '退出' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title={isZh ? "总订单" : "Total Orders"}
            value={stats.total}
            icon={Inbox}
            color="text-stone-600"
          />
          <StatCard
            title={isZh ? "待处理" : "Pending"}
            value={stats.assigned + stats.paid}
            icon={AlertCircle}
            color="text-orange-600"
          />
          <StatCard
            title={isZh ? "处理中" : "In Progress"}
            value={stats.in_progress}
            icon={Clock}
            color="text-purple-600"
          />
          <StatCard
            title={isZh ? "已完成" : "Completed"}
            value={stats.completed}
            icon={CheckCircle}
            color="text-green-600"
          />
        </div>

        {/* 最近订单 */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-lg font-medium text-stone-800">{isZh ? '最近订单' : 'Recent Orders'}</h2>
            <Link
              href="/master/orders"
              className="text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              {isZh ? '查看全部 →' : 'View All →'}
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="px-6 py-12 text-center text-stone-400">
              <Inbox size={48} className="mx-auto mb-3 opacity-50" />
              <p>{isZh ? '暂无订单' : 'No orders yet'}</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentOrders.map((order) => {
                const status = statusMap[order.status] || statusMap.pending;
                const Icon = status.icon;
                return (
                  <Link
                    key={order.id}
                    href={`/master/orders/${order.id}`}
                    className="flex items-center px-6 py-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.color} mr-4`}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-800 truncate">
                          {order.service_name}
                        </span>
                        <span className="text-xs text-stone-400">
                          {order.user?.full_name || order.user?.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-stone-500">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-sm font-medium text-stone-600">
                          ${order.amount} {order.currency}
                        </span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-stone-100 ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="text-2xl font-bold text-stone-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
