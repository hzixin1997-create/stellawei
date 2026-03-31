"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

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
          buttonVariants({ variant: "ghost" }),
          defaultClassNames.button_previous,
          "h-7 w-7 p-0 hover:bg-accent"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          defaultClassNames.button_next,
          "h-7 w-7 p-0 hover:bg-accent"
        ),
        month_grid: cn(defaultClassNames.month_grid, "w-full border-collapse table-fixed"),
        weekdays: cn(defaultClassNames.weekdays, "flex justify-between mb-1"),
        weekday: cn(defaultClassNames.weekday, "text-muted-foreground w-9 font-normal text-[0.8rem] text-center"),
        week: cn(defaultClassNames.week, "flex w-full justify-between gap-0.5"),
        day: cn(
          defaultClassNames.day,
          "h-9 w-9 text-center text-sm p-0 relative overflow-hidden"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          defaultClassNames.day_button,
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md overflow-hidden"
        ),
        selected: cn(
          defaultClassNames.selected,
          "bg-violet-600 text-white hover:bg-violet-700 hover:text-white focus:bg-violet-600 focus:text-white rounded-md overflow-hidden"
        ),
        today: cn(defaultClassNames.today, "bg-accent text-accent-foreground rounded-md border border-violet-300"),
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
