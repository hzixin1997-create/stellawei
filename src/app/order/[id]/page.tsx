import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, AlertCircle, MessageCircle, Send } from "lucide-react";

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
  response_deadline?: string;
  created_at: string;
  updated_at: string;
  master: { display_name: string; avatar_url?: string };
}

export default function OrderDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthLocation, setBirthLocation] = useState("");

  useEffect(() => {
    loadOrder();
  }, [params.id]);

  async function loadOrder() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login?redirect=/order/" + params.id);
        return;
      }

      const res = await fetch(`/api/orders/${params.id}`, {
        headers: { authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Order load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitQuestion() {
    if (!questionText.trim() || questionText.trim().length < 10) {
      alert("请详细描述您的问题（至少10个字）");
      return;
    }
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/orders/${params.id}/question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question: questionText,
          birth_date: birthDate,
          birth_time: birthTime,
          birth_location: birthLocation,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
        alert("问题已提交，师傅将在48小时内回复");
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

  const statusMap: Record<string, { label: string; color: string; icon: any; desc: string }> = {
    pending: { label: "待付款", color: "bg-yellow-100 text-yellow-800", icon: Clock, desc: "请完成付款以开始咨询" },
    paid: { label: "已付款", color: "bg-blue-100 text-blue-800", icon: CheckCircle, desc: "付款成功，请提交您的问题" },
    assigned: { label: "已分配", color: "bg-orange-100 text-orange-800", icon: AlertCircle, desc: "师傅已收到您的问题，正在准备回复" },
    "in_progress": { label: "处理中", color: "bg-purple-100 text-purple-800", icon: Clock, desc: "师傅正在回复中" },
    completed: { label: "已完成", color: "bg-green-100 text-green-800", icon: CheckCircle, desc: "咨询已完成" },
    cancelled: { label: "已取消", color: "bg-gray-100 text-gray-800", icon: AlertCircle, desc: "订单已取消" },
  };

  const status = statusMap[order.status] || statusMap.pending;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/orders" className="text-stone-500 hover:text-stone-700">
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
            <div className="flex items-center gap-3">
              {order.master?.avatar_url && (
                <img
                  src={order.master.avatar_url}
                  alt={order.master.display_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <div>
                <h2 className="text-lg font-semibold text-stone-800">{order.service_name}</h2>
                <p className="text-sm text-stone-500">{order.master?.display_name}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} flex items-center gap-1.5`}>
              <StatusIcon size={14} />
              {status.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-stone-500">
            <p>金额：{order.currency} {order.amount}</p>
            <p>订单号：{order.id.slice(0, 8)}...</p>
          </div>

          <div className="mt-4 p-3 bg-stone-50 rounded-lg text-sm text-stone-600">
            {status.desc}
          </div>
        </div>

        {/* 待付款状态 */}
        {order.status === "pending" && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6 text-center">
            <Clock size={32} className="text-yellow-500 mx-auto mb-3" />
            <p className="text-stone-600 mb-4">您的订单正在等待付款</p>
            <p className="text-sm text-stone-400">付款成功后即可开始咨询</p>
          </div>
        )}

        {/* 已付款，等待提交问题 */}
        {order.status === "paid" && order.type === "message" && !order.user_question && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-stone-800 mb-1 flex items-center gap-2">
              <MessageCircle size={20} />
              提交您的问题
            </h3>
            <p className="text-sm text-stone-500 mb-4">请详细描述您想咨询的问题，师傅将在48小时内回复</p>

            <div className="space-y-4">
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="请详细描述您的问题，例如：&#10;1. 您想咨询的具体问题&#10;2. 相关背景信息&#10;3. 您希望得到的指引方向..."
                className="w-full h-40 p-4 border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-700"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-stone-500 mb-1">出生日期（可选）</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-500 mb-1">出生时间（可选）</label>
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-500 mb-1">出生地点（可选）</label>
                  <input
                    type="text"
                    value={birthLocation}
                    onChange={(e) => setBirthLocation(e.target.value)}
                    placeholder="如：北京"
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                onClick={submitQuestion}
                disabled={saving}
                className="w-full py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {saving ? "提交中..." : "提交问题"}
              </button>
            </div>
          </div>
        )}

        {/* 已提交问题，等待回复 */}
        {order.user_question && !order.master_response && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">您的问题</h3>
            <div className="bg-stone-50 rounded-lg p-4 mb-4">
              <p className="text-stone-700 whitespace-pre-wrap">{order.user_question}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Clock size={16} />
              <p>师傅正在准备回复，预计48小时内完成</p>
            </div>
          </div>
        )}

        {/* 师傅回复 */}
        {order.master_response && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <CheckCircle size={16} />
              师傅回复
            </h3>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
              <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">{order.master_response}</p>
            </div>
            <p className="text-xs text-stone-400 mt-2">
              回复于 {new Date(order.master_response_at || order.updated_at).toLocaleString("zh-CN")}
            </p>
          </div>
        )}

        {/* 已完成 */}
        {order.status === "completed" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-medium">此咨询已完成</p>
            <p className="text-sm text-green-600 mt-1">感谢您的使用，如有需要欢迎再次预约</p>
          </div>
        )}
      </main>
    </div>
  );
}
