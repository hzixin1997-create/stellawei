import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { zhCN, enUS } from 'react-day-picker/locale';

const Calendar = dynamic(
  () => import('@/components/ui/calendar').then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => <div className="h-72 w-72 bg-black/20 rounded-lg animate-pulse" />,
  }
);

interface RescheduleCalendarProps {
  isZh: boolean;
  rescheduleDate: string | null;
  onDateChange: (date: string) => void;
}

export default function RescheduleCalendar({
  isZh,
  rescheduleDate,
  onDateChange,
}: RescheduleCalendarProps) {
  const locale = isZh ? zhCN : enUS;

  return (
    <Calendar
      mode="single"
      selected={rescheduleDate ? new Date(rescheduleDate) : undefined}
      onSelect={(date) => {
        if (date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          onDateChange(`${year}-${month}-${day}`);
        }
      }}
      locale={locale}
      disabled={(date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < today.getTime();
      }}
      className="rounded-md"
    />
  );
}
