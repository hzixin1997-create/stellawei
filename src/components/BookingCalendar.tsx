import React from 'react';
import dynamic from 'next/dynamic';
import { zhCN, enUS } from 'react-day-picker/locale';

const Calendar = dynamic(
  () => import('@/components/ui/calendar').then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => <div className="h-72 w-72 bg-stone-100 rounded-lg animate-pulse" />,
  }
);

interface BookingCalendarProps {
  isZh: boolean;
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export default function BookingCalendar({ isZh, selectedDate, onSelect }: BookingCalendarProps) {
  return (
    <Calendar
      mode="single"
      selected={selectedDate}
      onSelect={onSelect}
      locale={isZh ? zhCN : enUS}
      disabled={(date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < today.getTime();
      }}
      className="rounded-md border"
    />
  );
}
