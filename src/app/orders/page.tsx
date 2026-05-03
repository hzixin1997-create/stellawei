import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, Clock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

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
  master: { display_name: string; avatar_url?: string };
}

export default function OrdersPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login?redirect=/orders");
        return;
      }

      const res = await fetch("/api/orders?limit=50", {
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

  const statusMap: Record<string, { label: string; color: string; icon: any; action?: string }> = {
    pending: { label: "待付款", color: "bg-yellow-100 text-yellow-800", icon: Clock, action: "去付款" },
    paid: { label: "已付款", color: "bg-blue-100 text-blue-800", icon: CheckCircle, action: "提交问题" },
    assigned: { label: "已分配", color: "bg-orange-100 text-orange-800", icon: AlertCircle, action: "查看详情" },
    "in_progress": { label: "处理中", color: "bg-purple-100 text-purple-800", icon: Clock, action: "查看详情" },
    completed: { label: "已完成", color: "bg-green-100 text-green-800", icon: CheckCircle, action: "查看详情" },
    cancelled: { label: "已取消", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-stone-800">我的订单</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
            <Inbox size={48} className="mx-auto mb-3 text-stone-300" />
            <p className="text-stone-500 mb-4">暂无订单</p>
            <Link
              href="/masters"
              className="inline-block px-6 py-2.5 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 transition-colors"
            >
              去预约师傅
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusMap[order.status] || statusMap.pending;
              const Icon = status.icon;
              return (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="block bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {order.master?.avatar_url && (
                      <img
                        src={order.master.avatar_url}
                        alt={order.master.display_name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-stone-800">{order.service_name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                        {order.master_response && !order.master_read && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
                            新回复
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500 mb-1">
                        {order.master?.display_name} · {order.currency} {order.amount}
                      </p>
                      <p className="text-xs text-stone-400">
                        {new Date(order.created_at).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-amber-700 font-medium flex-shrink-0">
                      {status.action}
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
