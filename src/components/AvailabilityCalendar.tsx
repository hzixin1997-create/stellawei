import React from 'react';
import dynamic from 'next/dynamic';

const SimpleCalendar = dynamic(
  () => import('@/components/SimpleCalendar').then((mod) => mod.SimpleCalendar),
  {
    ssr: false,
    loading: () => <div className="h-72 w-72 bg-black/20 rounded-lg animate-pulse" />,
  }
);

interface AvailabilityCalendarProps {
  selected: Date;
  onSelect: (date: Date) => void;
  disabled?: (date: Date) => boolean;
}

export default function AvailabilityCalendar({ selected, onSelect, disabled }: AvailabilityCalendarProps) {
  return (
    <SimpleCalendar
      selected={selected}
      onSelect={onSelect}
      disabled={disabled}
    />
  );
}
