import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(price)
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...options,
  })
}

export function generateOrderNumber(): string {
  const prefix = 'CH'
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `${prefix}-${date}-${random}`
}

export function getStarRating(rating: number): string {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '')
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function calculateTimeSlots(
  startHour: number,
  endHour: number,
  durationMinutes: number
): string[] {
  const slots: string[] = []
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += durationMinutes) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(time)
    }
  }
  return slots
}

// ─── 咨询时间过期判断 ───

export function isConsultationExpired(
  booking: { scheduled_at?: string | null; duration_minutes?: number | null; status?: string }
): boolean {
  if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'refunded') {
    return false // Already in a terminal state
  }
  if (!booking.scheduled_at || !booking.duration_minutes) {
    return false // Can't determine if no time data
  }
  const endTime = new Date(booking.scheduled_at).getTime() + booking.duration_minutes * 60 * 1000
  return Date.now() > endTime
}

export function getConsultationDisplayStatus(
  booking: { status: string; scheduled_at?: string | null; duration_minutes?: number | null; expires_at?: string | null }
): string {
  // 终端状态直接返回
  if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'refunded') {
    return booking.status
  }

  // pending 订单：检查支付是否已过期
  if (booking.status === 'pending' && booking.expires_at) {
    const expiresTime = new Date(booking.expires_at).getTime()
    if (!isNaN(expiresTime) && Date.now() > expiresTime) {
      return 'expired'
    }
  }

  // 以下是有 scheduled_at 的实时咨询的时间状态判断
  if (!booking.scheduled_at || !booking.duration_minutes) {
    return booking.status
  }
  
  // 正规做法：scheduled_at 是 ISO 格式（含时区信息），直接解析为 UTC 时间戳
  const scheduledTime = new Date(booking.scheduled_at).getTime()
  if (isNaN(scheduledTime)) {
    console.error('[utils] Invalid scheduled_at:', booking.scheduled_at)
    return booking.status
  }
  
  const endTime = scheduledTime + booking.duration_minutes * 60 * 1000
  const now = Date.now()

  console.log('[utils] getConsultationDisplayStatus:', {
    scheduled_at: booking.scheduled_at,
    scheduledTime: new Date(scheduledTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    now: new Date(now).toISOString(),
    duration: booking.duration_minutes,
    status: booking.status,
    result: now < scheduledTime ? 'confirmed' : now < endTime ? 'in_progress' : 'completed'
  })

  if (now < scheduledTime) {
    return 'confirmed' // 还没到预约时间
  } else if (now >= scheduledTime && now < endTime) {
    return 'in_progress' // 咨询进行中
  } else {
    return 'completed' // 时间结束
  }
}