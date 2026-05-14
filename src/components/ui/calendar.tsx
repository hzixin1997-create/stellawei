"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: cn(defaultClassNames.root, "w-fit"),
        months: cn(defaultClassNames.months, "flex flex-col sm:flex-row gap-4"),
        month: cn(defaultClassNames.month, "space-y-3"),
        // 月份标题和导航按钮放在同一行
        month_caption: cn(defaultClassNames.month_caption, "flex items-center justify-between px-1 mb-2"),
        caption_label: cn(defaultClassNames.caption_label, "text-sm font-semibold"),
        // 导航按钮容器
        nav: cn(defaultClassNames.nav, "flex items-center gap-1"),
        button_previous: cn(
          defaultClassNames.button_previous,
          "h-7 w-7 p-0 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        ),
        button_next: cn(
          defaultClassNames.button_next,
          "h-7 w-7 p-0 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        ),
        month_grid: cn(defaultClassNames.month_grid, "w-full border-collapse"),
        weekdays: cn(defaultClassNames.weekdays, "flex justify-between mb-1"),
        weekday: cn(defaultClassNames.weekday, "text-muted-foreground w-9 font-normal text-[0.8rem] text-center"),
        week: cn(defaultClassNames.week, "flex w-full justify-between"),
        day: cn(
          defaultClassNames.day,
          "h-9 w-9 text-center text-sm p-0 relative"
        ),
        day_button: cn(
          defaultClassNames.day_button,
          "h-9 w-9 p-0 font-normal rounded-md transition-all",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1",
          // 默认状态
          "bg-transparent text-stone-700",
          // 今天状态
          "data-[today=true]:bg-accent data-[today=true]:border data-[today=true]:border-violet-300"
        ),
        // 选中日期的父元素样式
        selected: cn(
          defaultClassNames.selected,
          "[&_button]:bg-violet-600 [&_button]:text-white [&_button]:hover:bg-violet-700 [&_button]:hover:text-white"
        ),
        today: cn(defaultClassNames.today, ""),
        outside: cn(
          defaultClassNames.outside,
          "text-muted-foreground opacity-40"
        ),
        disabled: cn(defaultClassNames.disabled, "text-muted-foreground opacity-30 cursor-not-allowed"),
        hidden: cn(defaultClassNames.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className={cn("h-4 w-4", className)} {...props} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
