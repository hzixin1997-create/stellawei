"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Inbox, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface Order {
  id: string;
  status: string;
  type: string;
  service_name: string;
  amount: number;
  currency: string;
  user_question?: string;
  user_question_submitted_at?: string;
  master_response?: string;
  master_response_at?: string;
  master_read: boolean;
  created_at: string;
  updated_at: string;
  user: { full_name?: string; email?: string };
}

export default function MasterOrderDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [responseText, setResponseText] = useState("");

  useEffect(() => {
    loadOrder();
  }, [params.id]);

  async function loadOrder() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/master/login");
        return;
      }

      const res = await fetch(`/api/orders/${params.id}`, {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (data.order) {
        setOrder(data.order);
        if (data.order.master_response) {
          setResponseText(data.order.master_response);
        }
      }
    } catch (err) {
      console.error("Order load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitResponse(markCompleted: boolean) {
    if (!responseText.trim()) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/orders/${params.id}/response`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          response: responseText,
          mark_completed: markCompleted,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        alert(markCompleted ? "已提交回复并标记完成" : "已提交回复");
      } else {
        alert(data.error || "提交失败");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("提交失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">加载中...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-500">订单不存在</div>
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

  const status = statusMap[order.status] || statusMap.pending;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 顶部 */}
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/master/orders" className="text-stone-500 hover:text-stone-700">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-lg font-medium text-stone-800">订单详情</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* 订单信息 */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-stone-800">{order.service_name}</h2>
              <p className="text-sm text-stone-500 mt-1">
                {order.type === "message" ? "留言咨询" : "预约咨询"} · {order.currency} {order.amount}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} flex items-center gap-1.5`}>
              <StatusIcon size={14} />
              {status.label}
            </span>
          </div>

          <div className="text-sm text-stone-500 space-y-1">
            <p>客户：{order.user?.full_name || order.user?.email || "匿名用户"}</p>
            <p>订单号：{order.id}</p>
            <p>创建时间：{new Date(order.created_at).toLocaleString("zh-CN")}</p>
          </div>
        </div>

        {/* 用户问题 */}
        {order.user_question && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">客户问题</h3>
            <div className="bg-stone-50 rounded-lg p-4">
              <p className="text-stone-700 whitespace-pre-wrap">{order.user_question}</p>
            </div>
            <p className="text-xs text-stone-400 mt-2">
              提交于 {new Date(order.user_question_submitted_at || order.created_at).toLocaleString("zh-CN")}
            </p>
          </div>
        )}

        {/* 师傅回复 */}
        {(order.status === "assigned" || order.status === "in_progress" || order.status === "completed") && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
              {order.master_response ? "您的回复" : "写回复"}
            </h3>
            
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="请输入您的回复内容..."
              className="w-full h-48 p-4 border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-700"
              disabled={order.status === "completed"}
            />
            
            {order.master_response && (
              <p className="text-xs text-stone-400 mt-2">
                上次回复于 {new Date(order.master_response_at || order.updated_at).toLocaleString("zh-CN")}
              </p>
            )}

            {order.status !== "completed" && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => submitResponse(false)}
                  disabled={saving || !responseText.trim()}
                  className="px-6 py-2.5 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "保存中..." : "提交回复"}
                </button>
                <button
                  onClick={() => submitResponse(true)}
                  disabled={saving || !responseText.trim()}
                  className="px-6 py-2.5 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "保存中..." : "提交并标记完成"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 已完成状态 */}
        {order.status === "completed" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-medium">此订单已完成</p>
          </div>
        )}
      </main>
    </div>
  );
}
