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
  serviceType?: string;
  scheduledAt?: string;
  price?: number;
}

// 演示数据
const DEMO_DATA: ConfirmationPageProps = {
  orderId: "ord_8f3a2b1c",
  masterName: "Luna",
  serviceType: "Tarot - Basic Consultation",
  scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 明天
  price: 28,
};

function CountdownTimer({ targetDate }: { targetDate: string }) {
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
        <span className="font-medium">Your consultation time has arrived! The chat window will open shortly.</span>
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
      <span className="text-sm text-slate-400">until your consultation</span>
    </div>
  );
}

export default function BookingConfirmationPage() {
  const [supplement, setSupplement] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const data = DEMO_DATA;
  const scheduledDate = new Date(data.scheduledAt || "");

  const handleSubmit = () => {
    if (!supplement.trim() || supplement.length > 500) return;
    // Submit supplement to API
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-green-900/30 text-green-400 px-4 py-2 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            Payment Successful
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Your Consultation is Confirmed</h1>
          <p className="text-slate-400">Order #{data.orderId?.slice(-8)}</p>
        </div>

        {/* Order Summary Card */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Master</p>
                <p className="font-medium text-slate-100">{data.masterName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Service</p>
                <p className="font-medium text-slate-100">{data.serviceType}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Scheduled</p>
                <p className="font-medium text-slate-100 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  {scheduledDate.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Price</p>
                <p className="font-medium text-amber-400">${data.price}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Countdown */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <CountdownTimer targetDate={data.scheduledAt || ""} />
            <p className="text-sm text-slate-500 mt-3">
              A chat window will automatically appear here when your consultation time arrives.
              Please stay on this page or enable notifications.
            </p>
          </CardContent>
        </Card>

        {/* Supplement Message Area */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              Supplement Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted ? (
              <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Submitted Successfully</span>
                </div>
                <p className="text-sm text-slate-400">
                  Your background information has been sent to {data.masterName}. 
                  They will review it before your consultation begins.
                </p>
                <div className="mt-3 p-3 bg-slate-800 rounded-lg">
                  <p className="text-sm text-slate-300 italic">"{supplement}"...</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  Help {data.masterName} prepare for your consultation by sharing 
                  relevant background information. This is optional but recommended.
                </p>
                <Textarea
                  value={supplement}
                  onChange={(e) => setSupplement(e.target.value)}
                  placeholder="e.g., I'm currently facing a career decision between staying in tech or moving to education. I've been at my current job for 3 years and feel restless..."
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
                    Submit to Master
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* What to expect */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg">What to Expect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { step: 1, text: "Master reviews your supplement information" },
              { step: 2, text: "At appointment time, chat window opens automatically" },
              { step: 3, text: "Real-time consultation (text, voice, or video)" },
              { step: 4, text: "Session ends, full transcript saved to your order" },
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
