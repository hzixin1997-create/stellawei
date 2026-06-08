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
    const masterName = isZh
      ? (booking.master_id === 'master-luna' ? '卢娜师傅' : booking.master_id === 'wu-yang' ? '戊阳' : booking.master_id === 'zhang-yihua' ? '张易桦' : '师傅')
      : (booking.master_id === 'master-luna' ? 'Luna' : booking.master_id === 'wu-yang' ? 'Wu Yang' : booking.master_id === 'zhang-yihua' ? 'Zhang Yihua' : 'Master');
    return (
      <Card className="fixed bottom-4 right-4 z-50 max-w-xs w-[calc(100vw-2rem)] bg-blue-50 border-blue-200 shadow-lg">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-800 truncate">
                {isZh ? `留言咨询 ${masterName}` : `Message ${masterName}`}
              </p>
              <p className="text-xs text-blue-600">
                {isZh ? '师傅已回复' : 'Master replied'}
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-2 shrink-0" onClick={() => router.push(`/chat/${booking.id}`)}>
            {isZh ? '查看' : 'View'}
          </Button>
        </div>
      </Card>
    );
  }

  // 退款状态优先
  if (isRefund) {
    return (
      <Card className="fixed bottom-4 right-4 z-50 max-w-xs w-[calc(100vw-2rem)] bg-orange-50 border-orange-200 shadow-lg">
        <div className="flex items-center gap-2 p-3">
          <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-orange-800">
              {isZh ? '退款处理中' : 'Refund Processing'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // upcoming
  if (isUpcoming) {
    const masterName = isZh
      ? (booking.master_id === 'master-luna' ? '卢娜师傅' : booking.master_id === 'wu-yang' ? '戊阳' : booking.master_id === 'zhang-yihua' ? '张易桦' : '师傅')
      : (booking.master_id === 'master-luna' ? 'Luna' : booking.master_id === 'wu-yang' ? 'Wu Yang' : booking.master_id === 'zhang-yihua' ? 'Zhang Yihua' : 'Master');
    const timeStr = formatBookingTimeDisplay({ scheduled_date: booking.scheduled_date, scheduled_time: booking.scheduled_time, timezone: 'Asia/Shanghai' });

    return (
      <Card className="fixed bottom-4 right-4 z-50 max-w-xs w-[calc(100vw-2rem)] bg-violet-50 border-violet-200 shadow-lg">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-violet-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-violet-800 truncate">
                {isZh ? `下一场 ${masterName}` : `Upcoming ${masterName}`}
              </p>
              <p className="text-xs text-violet-600">
                {timeStr} · {countdown}
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-7 px-2 shrink-0" onClick={() => router.push(`/chat/${booking.id}`)}>
            {isZh ? '进入' : 'Chat'}
          </Button>
        </div>
      </Card>
    );
  }

  // in_progress
  if (isInProgress) {
    const masterName = isZh
      ? (booking.master_id === 'master-luna' ? '卢娜师傅' : booking.master_id === 'wu-yang' ? '戊阳' : booking.master_id === 'zhang-yihua' ? '张易桦' : '师傅')
      : (booking.master_id === 'master-luna' ? 'Luna' : booking.master_id === 'wu-yang' ? 'Wu Yang' : booking.master_id === 'zhang-yihua' ? 'Zhang Yihua' : 'Master');

    return (
      <Card className="fixed bottom-4 right-4 z-50 max-w-xs w-[calc(100vw-2rem)] bg-emerald-50 border-emerald-200 shadow-lg">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-800 truncate">
                {isZh ? `与 ${masterName} 进行中` : `${masterName} In Progress`}
              </p>
              <p className="text-xs text-emerald-600">
                {isZh ? '剩余' : 'Remaining'} {countdown}
              </p>
            </div>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2 shrink-0" onClick={() => router.push(`/chat/${booking.id}`)}>
            {isZh ? '继续' : 'Continue'}
          </Button>
        </div>
      </Card>
    );
  }

  // ended
  if (isEnded) {
    const masterName = isZh
      ? (booking.master_id === 'master-luna' ? '卢娜师傅' : booking.master_id === 'wu-yang' ? '戊阳' : booking.master_id === 'zhang-yihua' ? '张易桦' : '师傅')
      : (booking.master_id === 'master-luna' ? 'Luna' : booking.master_id === 'wu-yang' ? 'Wu Yang' : booking.master_id === 'zhang-yihua' ? 'Zhang Yihua' : 'Master');

    return (
      <Card className="fixed bottom-4 right-4 z-50 max-w-xs w-[calc(100vw-2rem)] bg-stone-50 border-stone-200 shadow-lg">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 min-w-0">
            <MessageCircle className="w-4 h-4 text-stone-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-800 truncate">
                {isZh ? `与 ${masterName} 已结束` : `${masterName} Ended`}
              </p>
              <p className="text-xs text-stone-600">
                {isZh ? '仍可查看聊天记录' : 'Chat history available'}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-stone-300 text-stone-700 text-xs h-7 px-2 shrink-0" onClick={() => router.push(`/chat/${booking.id}`)}>
            {isZh ? '查看' : 'View'}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
}
