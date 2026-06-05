'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, MessageCircle, AlertTriangle, CreditCard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { formatBookingTimeDisplay } from '@/lib/utils';

interface Booking {
  id: string;
  master_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: string;
  payment_status: string;
  refund_status?: string;
  total_amount: number;
  currency: string;
  created_at: string;
  is_first_time: boolean;
  consultation_type?: string;
  deleted_at?: string | null;
  reschedule_notice?: string | null;
}

interface ActiveBookingBannerProps {
  isZh: boolean;
}

export function ActiveBookingBanner({ isZh }: ActiveBookingBannerProps) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchActiveBooking = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/user/bookings', {
        headers: { authorization: `Bearer ${session?.access_token || ''}` },
      });
      const json = await res.json();

      if (res.ok && json.bookings) {
        const now = Date.now();
        const active = json.bookings
          .filter((b: Booking) => !b.deleted_at && b.payment_status === 'paid')
          .sort((a: Booking, b: Booking) => {
            // 优先显示: 留言咨询 > refund > in_progress > upcoming > ended > completed
            const priority: Record<string, number> = { refund_requested: 4, in_progress: 2, upcoming: 1, confirmed: 1, message: 0, ended: 3, completed: 5 };
            const pa = priority[a.status] || (a.consultation_type === 'message' ? 0 : 1);
            const pb = priority[b.status] || (b.consultation_type === 'message' ? 0 : 1);
            return pa - pb;
          })
          .find((b: Booking) => {
            // 只显示 relevant 状态
            return b.refund_status !== 'refunded' && b.refund_status !== 'rejected';
          });

        setBooking(active || null);
      }
      setLoading(false);
    };

    fetchActiveBooking();
  }, []);

  // 倒计时
  useEffect(() => {
    if (!booking) return;
    const scheduled = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`).getTime();
    const end = scheduled + (booking.duration_minutes || 25) * 60 * 1000;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = scheduled - now;
      const remaining = end - now;

      if (diff > 0) {
        // 开始前
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (h > 0) {
          setCountdown(`${h}小时${m}分钟`);
        } else {
          setCountdown(`${m}分${s}秒`);
        }
      } else if (remaining > 0) {
        // 进行中
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        if (h > 0) {
          setCountdown(`${h}小时${m}分钟`);
        } else {
          setCountdown(`${m}分${s}秒`);
        }
      } else {
        setCountdown('已结束');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [booking]);

  if (loading || !booking) return null;

  const now = Date.now();
  const scheduled = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`).getTime();
  const end = scheduled + (booking.duration_minutes || 25) * 60 * 1000;
  const isUpcoming = now < scheduled;
  const isInProgress = now >= scheduled && now < end;
  const isEnded = now >= end;
  const isRefund = booking.refund_status && booking.refund_status !== 'none' && booking.refund_status !== 'refunded' && booking.refund_status !== 'rejected';

  // 留言咨询（无倒计时）
  if (booking.consultation_type === 'message' || booking.status === 'message') {
    const masterName = booking.master_id === 'master-luna' ? '卢娜师傅' : 
                       booking.master_id === 'wu-yang' ? '戊阳' : 
                       booking.master_id === 'zhang-yihua' ? '张易桦' : '师傅';
    return (
      <Card className="w-full bg-blue-50 border-blue-200 mb-4">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                {isZh ? `您有一条待查看的留言咨询 ${masterName}` : `You have a pending message consultation with ${masterName}`}
              </p>
              <p className="text-xs text-blue-600">
                {isZh ? '师傅已回复，请查看留言内容' : 'Master has replied, please check the message'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => router.push(`/chat/${booking.id}`)}
          >
            {isZh ? '查看留言' : 'View Message'}
          </Button>
        </div>
      </Card>
    );
  }

  // 退款状态优先
  if (isRefund) {
    return (
      <Card className="w-full bg-orange-50 border-orange-200 mb-4">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <div>
              <p className="text-sm font-semibold text-orange-800">
                {isZh ? '退款处理中' : 'Refund Processing'}
              </p>
              <p className="text-xs text-orange-600">
                {isZh ? '您的退款申请正在处理，请耐心等待' : 'Your refund request is being processed'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // upcoming
  if (isUpcoming) {
    const masterName = booking.master_id === 'master-luna' ? '卢娜师傅' : 
                       booking.master_id === 'wu-yang' ? '戊阳' : 
                       booking.master_id === 'zhang-yihua' ? '张易桦' : '师傅';
    const timeStr = formatBookingTimeDisplay({ scheduled_date: booking.scheduled_date, scheduled_time: booking.scheduled_time, timezone: 'Asia/Shanghai' });

    return (
      <Card className="w-full bg-violet-50 border-violet-200 mb-4">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-violet-600" />
            <div>
              <p className="text-sm font-semibold text-violet-800">
                {isZh ? `您的下一场咨询 ${masterName}` : `Your upcoming consultation with ${masterName}`}
              </p>
              <p className="text-xs text-violet-600">
                {timeStr} · {isZh ? '距离开始还有' : 'Starts in'} {countdown}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => router.push(`/chat/${booking.id}`)}
          >
            {isZh ? '进入咨询' : 'Enter Chat'}
          </Button>
        </div>
      </Card>
    );
  }

  // in_progress
  if (isInProgress) {
    const masterName = booking.master_id === 'master-luna' ? '卢娜师傅' : 
                       booking.master_id === 'wu-yang' ? '戊阳' : 
                       booking.master_id === 'zhang-yihua' ? '张易桦' : '师傅';

    return (
      <Card className="w-full bg-emerald-50 border-emerald-200 mb-4">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {isZh ? `与 ${masterName} 咨询进行中` : `Consultation with ${masterName} in Progress`}
              </p>
              <p className="text-xs text-emerald-600">
                {isZh ? '剩余时间' : 'Remaining'} {countdown}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => router.push(`/chat/${booking.id}`)}
          >
            {isZh ? '继续咨询' : 'Continue Chat'}
          </Button>
        </div>
      </Card>
    );
  }

  // ended
  if (isEnded) {
    const masterName = booking.master_id === 'master-luna' ? '卢娜师傅' : 
                       booking.master_id === 'wu-yang' ? '戊阳' : 
                       booking.master_id === 'zhang-yihua' ? '张易桦' : '师傅';

    return (
      <Card className="w-full bg-stone-50 border-stone-200 mb-4">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-stone-600" />
            <div>
              <p className="text-sm font-semibold text-stone-800">
                {isZh ? `与 ${masterName} 的咨询已结束` : `Consultation with ${masterName} Ended`}
              </p>
              <p className="text-xs text-stone-600">
                {isZh ? '您仍可查看聊天记录' : 'You can still view chat history'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-stone-300 text-stone-700"
            onClick={() => router.push(`/chat/${booking.id}`)}
          >
            {isZh ? '查看聊天记录' : 'View Chat'}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
