"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageSquare, Calendar, CheckCircle, AlertCircle } from "lucide-react";

interface ConfirmationPageProps {
  orderId?: string;
  masterName?: string;
  masterNameCn?: string;
  serviceType?: string;
  serviceTypeCn?: string;
  scheduledAt?: string;
  price?: number;
}

// 演示数据
const DEMO_DATA: ConfirmationPageProps = {
  orderId: "ord_8f3a2b1c",
  masterName: "Luna",
  masterNameCn: "卢娜师傅",
  serviceType: "Tarot - Basic Consultation",
  serviceTypeCn: "塔罗占卜 - 基础咨询",
  scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 明天
  price: 28,
};

function CountdownTimer({ targetDate, isZh }: { targetDate: string; isZh: boolean }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isPast, setIsPast] = useState(false);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;
      
      if (diff <= 0) {
        setIsPast(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setIsPast(false);
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (isPast) {
    return (
      <div className="flex items-center gap-2 text-green-400">
        <AlertCircle className="w-5 h-5" />
        <span className="font-medium">
          {isZh ? '您的咨询时间已到！聊天窗口即将开启。' : 'Your consultation time has arrived! The chat window will open shortly.'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-amber-400">
      <Clock className="w-5 h-5 animate-pulse" />
      <div className="flex gap-2 font-mono text-lg">
        <span>{String(timeLeft.hours).padStart(2, "0")}h</span>
        <span>{String(timeLeft.minutes).padStart(2, "0")}m</span>
        <span>{String(timeLeft.seconds).padStart(2, "0")}s</span>
      </div>
      <span className="text-sm text-slate-400">
        {isZh ? '距离咨询开始' : 'until your consultation'}
      </span>
    </div>
  );
}

export default function BookingConfirmationPage() {
  const [supplement, setSupplement] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isZh, setIsZh] = useState(true);
  const data = DEMO_DATA;
  const scheduledDate = new Date(data.scheduledAt || "");

  const handleSubmit = () => {
    if (!supplement.trim() || supplement.length > 500) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 语言切换 */}
        <div className="flex justify-end">
          <button
            onClick={() => setIsZh(!isZh)}
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isZh ? 'EN / 中文' : 'EN / 中文'}
          </button>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-green-900/30 text-green-400 px-4 py-2 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            {isZh ? '支付成功' : 'Payment Successful'}
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            {isZh ? '您的咨询已确认' : 'Your Consultation is Confirmed'}
          </h1>
          <p className="text-slate-400">
            {isZh ? `订单 #${data.orderId?.slice(-8)}` : `Order #${data.orderId?.slice(-8)}`}
          </p>
        </div>

        {/* Order Summary Card */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">{isZh ? '师傅' : 'Master'}</p>
                <p className="font-medium text-slate-100">{isZh ? data.masterNameCn : data.masterName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{isZh ? '服务' : 'Service'}</p>
                <p className="font-medium text-slate-100">{isZh ? data.serviceTypeCn : data.serviceType}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{isZh ? '预约时间' : 'Scheduled'}</p>
                <p className="font-medium text-slate-100 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  {scheduledDate.toLocaleString(isZh ? 'zh-CN' : 'en-US')}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{isZh ? '价格' : 'Price'}</p>
                <p className="font-medium text-amber-400">${data.price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Countdown */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <CountdownTimer targetDate={data.scheduledAt || ""} isZh={isZh} />
            <p className="text-sm text-slate-500 mt-3">
              {isZh
                ? '咨询时间到达时，聊天窗口将自动在此页面出现。请保持在此页面或开启通知。'
                : 'A chat window will automatically appear here when your consultation time arrives. Please stay on this page or enable notifications.'}
            </p>
          </CardContent>
        </Card>

        {/* Supplement Message Area */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              {isZh ? '补充信息' : 'Supplement Information'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted ? (
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{isZh ? '提交成功' : 'Submitted Successfully'}</span>
                </div>
                <p className="text-sm text-slate-400">
                  {isZh
                    ? `您的背景信息已发送给${data.masterNameCn || data.masterName}。师傅将在咨询开始前审阅。`
                    : `Your background information has been sent to ${data.masterName}. They will review it before your consultation begins.`}
                </p>
                <div className="mt-3 p-3 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-300 italic">"{supplement}"...</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  {isZh
                    ? `帮助${data.masterNameCn || data.masterName}为咨询做准备，分享相关背景信息。这是可选项但建议填写。`
                    : `Help ${data.masterName} prepare for your consultation by sharing relevant background information. This is optional but recommended.`}
                </p>
                <Textarea
                  value={supplement}
                  onChange={(e) => setSupplement(e.target.value)}
                  placeholder={isZh
                    ? "例如：我目前在面临职业抉择，在继续留在科技行业和转向教育领域之间犹豫。我在当前岗位已经工作了3年，感到有些不安..."
                    : "e.g., I'm currently facing a career decision between staying in tech or moving to education. I've been at my current job for 3 years and feel restless..."}
                  maxLength={500}
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 min-h-[120px] resize-none"
                />
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-slate-500 border-slate-700">
                    {supplement.length}/500
                  </Badge>
                  <Button
                    onClick={handleSubmit}
                    disabled={!supplement.trim() || supplement.length > 500}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {isZh ? '提交给师傅' : 'Submit to Master'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* What to expect */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">{isZh ? '流程说明' : 'What to Expect'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                step: 1,
                text: isZh ? '师傅审阅您补充的背景信息' : 'Master reviews your supplement information',
              },
              {
                step: 2,
                text: isZh ? '到达预约时间，聊天窗口自动开启' : 'At appointment time, chat window opens automatically',
              },
              {
                step: 3,
                text: isZh ? '实时咨询（文字或图片）' : 'Real-time consultation (text or image)',
              },
              {
                step: 4,
                text: isZh ? '咨询结束，完整记录保存至您的订单' : 'Session ends, full transcript saved to your order',
              },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-900 text-amber-400 text-xs font-medium flex items-center justify-center">
                  {step}
                </span>
                <p className="text-sm text-slate-300">{text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
