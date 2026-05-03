import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, CheckCircle, Clock, AlertCircle, Settings, LogOut } from "lucide-react";

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
        <div className="text-stone-600">加载中...</div>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    pending: { label: "待付款", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    paid: { label: "已付款", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
    assigned: { label: "待回复", color: "bg-orange-100 text-orange-800", icon: AlertCircle },
    "in_progress": { label: "处理中", color: "bg-purple-100 text-purple-800", icon: Clock },
    completed: { label: "已完成", color: "bg-green-100 text-green-800", icon: CheckCircle },
    cancelled: { label: "已取消", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-stone-800">师傅后台</h1>
            <p className="text-sm text-stone-500">Hi, {masterName}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/master/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Settings size={16} />
              设置
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="总订单"
            value={stats.total}
            icon={Inbox}
            color="text-stone-600"
          />
          <StatCard
            title="待处理"
            value={stats.assigned + stats.paid}
            icon={AlertCircle}
            color="text-orange-600"
          />
          <StatCard
            title="处理中"
            value={stats.in_progress}
            icon={Clock}
            color="text-purple-600"
          />
          <StatCard
            title="已完成"
            value={stats.completed}
            icon={CheckCircle}
            color="text-green-600"
          />
        </div>

        {/* 最近订单 */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-lg font-medium text-stone-800">最近订单</h2>
            <Link
              href="/master/orders"
              className="text-sm text-amber-700 hover:text-amber-800 font-medium"
            >
              查看全部 →
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="px-6 py-12 text-center text-stone-400">
              <Inbox size={48} className="mx-auto mb-3 opacity-50" />
              <p>暂无订单</p>
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
                        <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        {!order.master_read && order.user_question && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                            新消息
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 mt-0.5">
                        {order.user?.full_name || order.user?.email || "匿名用户"} · {order.currency} {order.amount}
                      </p>
                    </div>
                    <div className="text-sm text-stone-400">
                      {new Date(order.created_at).toLocaleDateString("zh-CN")}
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

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-stone-500">{title}</span>
        <Icon size={20} className={color} />
      </div>
      <div className="text-2xl font-bold text-stone-800">{value}</div>
    </div>
  );
}
