import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, CheckCircle, Clock, AlertCircle, Filter, ArrowLeft } from "lucide-react";

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

export default function MasterOrders() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadOrders();
  }, [filter]);

  async function loadOrders() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/master/login");
        return;
      }

      const statusParam = filter !== "all" ? `&status=${filter}` : "";
      const res = await fetch(`/api/master/orders?limit=100${statusParam}`, {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Orders load error:", err);
    } finally {
      setLoading(false);
    }
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

  const filters = [
    { key: "all", label: "全部" },
    { key: "paid", label: "待处理" },
    { key: "assigned", label: "待回复" },
    { key: "in_progress", label: "处理中" },
    { key: "completed", label: "已完成" },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/master/dashboard" className="text-stone-500 hover:text-stone-700">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-stone-800">订单管理</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 筛选器 */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter size={16} className="text-stone-400 flex-shrink-0" />
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? "bg-amber-700 text-white"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 订单列表 */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {orders.length === 0 ? (
            <div className="px-6 py-12 text-center text-stone-400">
              <Inbox size={48} className="mx-auto mb-3 opacity-50" />
              <p>暂无订单</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {orders.map((order) => {
                const status = statusMap[order.status] || statusMap.pending;
                const Icon = status.icon;
                return (
                  <Link
                    key={order.id}
                    href={`/master/orders/${order.id}`}
                    className="flex items-center px-6 py-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.color} mr-4 flex-shrink-0`}>
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
                      {order.user_question && !order.master_response && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ 等待回复
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-stone-400 flex-shrink-0 ml-4">
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
