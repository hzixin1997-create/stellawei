"use client";

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
  const [isZh, setIsZh] = useState(true);

  useEffect(() => {
    const lang = localStorage.getItem('language') || 'zh'
    setIsZh(lang === 'zh')
  }, [])

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
      alert(isZh ? "请详细描述您的问题（至少10个字）" : "Please describe your question in detail (at least 10 characters)");
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
        alert(isZh ? "问题已提交，师傅将在48小时内回复" : "Question submitted. Master will reply within 48 hours.");
      } else {
        alert(data.error || (isZh ? "提交失败" : "Submit failed"));
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert(isZh ? "提交失败，请重试" : "Submit failed, please try again");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">{isZh ? '加载中...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-500">{isZh ? '订单不存在' : 'Order not found'}</div>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; labelEn: string; color: string; icon: any; desc: string; descEn: string }> = {
    pending: { 
      label: "待付款", labelEn: "Pending Payment", 
      color: "bg-yellow-100 text-yellow-800", icon: Clock, 
      desc: "请完成付款以开始咨询", descEn: "Please complete payment to start consultation" 
    },
    paid: { 
      label: "已付款", labelEn: "Paid", 
      color: "bg-blue-100 text-blue-800", icon: CheckCircle, 
      desc: "付款成功，请提交您的问题", descEn: "Payment successful, please submit your question" 
    },
    assigned: { 
      label: "已分配", labelEn: "Assigned", 
      color: "bg-orange-100 text-orange-800", icon: AlertCircle, 
      desc: "师傅已收到您的问题，正在准备回复", descEn: "Master has received your question and is preparing a response" 
    },
    "in_progress": { 
      label: "处理中", labelEn: "In Progress", 
      color: "bg-purple-100 text-purple-800", icon: Clock, 
      desc: "师傅正在回复中", descEn: "Master is working on your response" 
    },
    completed: { 
      label: "已完成", labelEn: "Completed", 
      color: "bg-green-100 text-green-800", icon: CheckCircle, 
      desc: "咨询已完成", descEn: "Consultation completed" 
    },
    cancelled: { 
      label: "已取消", labelEn: "Cancelled", 
      color: "bg-gray-100 text-gray-800", icon: AlertCircle, 
      desc: "订单已取消", descEn: "Order cancelled" 
    },
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
            <h1 className="text-lg font-medium text-stone-800">{isZh ? '订单详情' : 'Order Details'}</h1>
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
                  loading="lazy"
                />
              )}
              <div>
                <h2 className="text-lg font-semibold text-stone-800">{order.service_name}</h2>
                <p className="text-sm text-stone-500">{order.master?.display_name}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} flex items-center gap-1.5`}>
              <StatusIcon size={14} />
              {isZh ? status.label : status.labelEn}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-stone-500">
            <p>{isZh ? '金额：' : 'Amount: '}{order.currency} {order.amount}</p>
            <p>{isZh ? '订单号：' : 'Order #'}{order.id.slice(0, 8)}...</p>
          </div>

          <div className="mt-4 p-3 bg-stone-50 rounded-lg text-sm text-stone-600">
            {isZh ? status.desc : status.descEn}
          </div>
        </div>

        {/* 待付款状态 */}
        {order.status === "pending" && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6 text-center">
            <Clock size={32} className="text-yellow-500 mx-auto mb-3" />
            <p className="text-stone-600 mb-4">{isZh ? '您的订单正在等待付款' : 'Your order is awaiting payment'}</p>
            <p className="text-sm text-stone-400">{isZh ? '付款成功后即可开始咨询' : 'Payment is required to start consultation'}</p>
          </div>
        )}

        {/* 已付款，等待提交问题 */}
        {order.status === "paid" && order.type === "message" && !order.user_question && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <h3 className="text-lg font-medium text-stone-800 mb-1 flex items-center gap-2">
              <MessageCircle size={20} />
              {isZh ? '提交您的问题' : 'Submit Your Question'}
            </h3>
            <p className="text-sm text-stone-500 mb-4">{isZh ? '请详细描述您想咨询的问题，师傅将在48小时内回复' : 'Please describe your question in detail. Master will reply within 48 hours.'}</p>

            <div className="space-y-4">
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder={isZh 
                  ? "请详细描述您的问题，例如：\n1. 您想咨询的具体问题\n2. 相关背景信息\n3. 您希望得到的指引方向..."
                  : "Please describe your question, e.g.:\n1. Your specific question\n2. Relevant background info\n3. What guidance you seek..."}
                className="w-full h-40 p-4 border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-stone-700"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-stone-500 mb-1">{isZh ? '出生日期（可选）' : 'Birth Date (Optional)'}</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-500 mb-1">{isZh ? '出生时间（可选）' : 'Birth Time (Optional)'}</label>
                  <input
                    type="time"
                    value={birthTime}
                    onChange={(e) => setBirthTime(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-500 mb-1">{isZh ? '出生地点（可选）' : 'Birth Location (Optional)'}</label>
                  <input
                    type="text"
                    value={birthLocation}
                    onChange={(e) => setBirthLocation(e.target.value)}
                    placeholder={isZh ? '如：北京' : 'e.g. Beijing'}
                    className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                onClick={submitQuestion}
                disabled={saving}
                className="w-full py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {saving ? (isZh ? '提交中...' : 'Submitting...') : (isZh ? '提交问题' : 'Submit Question')}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
