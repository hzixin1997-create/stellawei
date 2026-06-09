import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SimpleCalendarProps {
  selected?: Date
  onSelect?: (date: Date) => void
  disabled?: (date: Date) => boolean
}

export function SimpleCalendar({ selected, onSelect, disabled }: SimpleCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const isSelected = (day: number) => {
    if (!selected) return false
    return (
      selected.getFullYear() === year &&
      selected.getMonth() === month &&
      selected.getDate() === day
    )
  }

  const isDisabled = (day: number) => {
    const d = new Date(year, month, day)
    if (disabled) return disabled(d)
    return d.getTime() < today.getTime()
  }

  const handleClick = (day: number) => {
    const d = new Date(year, month, day)
    if (!isDisabled(day)) {
      onSelect?.(d)
    }
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  const cells = []
  // 空白
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(<div key={`empty-${i}`} />)
  }
  // 日期
  for (let d = 1; d <= daysInMonth; d++) {
    const selectedFlag = isSelected(d)
    const disabledFlag = isDisabled(d)
    cells.push(
      <button
        key={d}
        onClick={() => handleClick(d)}
        disabled={disabledFlag}
        className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
          selectedFlag
            ? 'bg-violet-600 text-white'
            : disabledFlag
              ? 'text-white/30 cursor-not-allowed'
              : 'hover:bg-white/10 text-white/70'
        }`}
      >
        {d}
      </button>
    )
  }

  return (
    <div className="w-fit">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded text-white">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-white">
          {year}年{month + 1}月
        </span>
        <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded text-white">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-white/40 mb-1">
        {weekDays.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells}
      </div>
    </div>
  )
}
