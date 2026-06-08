// ============================================================
// TimeEngine — 统一时间系统
// 所有时间计算的唯一入口
// ============================================================

export type SessionState = 'scheduled' | 'upcoming' | 'in_progress' | 'ended' | 'completed' | 'cancelled' | 'refunded' | 'pending' | 'expired' | 'confirmed';

export interface TimeBooking {
  id?: string;
  scheduled_at?: string | null;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  timezone?: string | null;
  duration_minutes?: number | null;
  status?: string;
  payment_status?: string;
  expires_at?: string | null;
}

export interface DisplayTimeResult {
  userLocalTime: string;
  userTimezone: string;
  advisorLocalTime: string;
  advisorTimezone: string;
  isoString: string;
}

export class TimeEngine {
  // ==================== 基础工具 ====================

  /** 当前时间戳（UTC毫秒，可覆盖用于测试） */
  static now(): number {
    return Date.now();
  }

  /** 解析 UTC 时间戳 */
  static parseUTC(isoString: string): number {
    return new Date(isoString).getTime();
  }

  /** 获取指定时区的本地时间字符串 */
  static formatInTimezone(isoString: string, timezone: string, locale: string = 'zh-CN'): string {
    return new Date(isoString).toLocaleString(locale, {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /** 获取时区短名称（城市名） */
  static getTimezoneShortName(tz: string): string {
    const map: Record<string, string> = {
      'Asia/Tokyo': '东京',
      'Asia/Shanghai': '北京',
      'Asia/Hong_Kong': '香港',
      'Asia/Singapore': '新加坡',
      'America/Los_Angeles': '洛杉矶',
      'America/New_York': '纽约',
      'Europe/London': '伦敦',
      'Europe/Paris': '巴黎',
      'Australia/Sydney': '悉尼',
      'UTC': 'UTC',
    };
    return map[tz] || tz;
  }

  // ==================== 状态机 ====================

  /** 获取统一 session 状态 */
  static getSessionState(
    booking: TimeBooking,
    now: number = this.now()
  ): SessionState {
    // 终端状态直接返回
    if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'refunded') {
      return booking.status as SessionState;
    }

    // pending 订单检查过期
    if (booking.status === 'pending' && booking.expires_at) {
      const expiresTime = this.parseUTC(booking.expires_at);
      if (!isNaN(expiresTime) && now > expiresTime) {
        return 'expired';
      }
    }

    // 实时咨询状态机
    // 核心原则：优先用 scheduled_date + scheduled_time 重建带北京时区的 scheduled_at
    // 因为用户选择的预约时间（date/time）是最可靠的数据源
    // scheduled_at 可能因为旧代码格式错误（缺少时区或UTC格式）而失效
    let scheduledAt: string | null = null;
    let startTime: number;
    
    if (booking.scheduled_date && booking.scheduled_time) {
      const timeStr = booking.scheduled_time.split(':').slice(0, 2).join(':');
      scheduledAt = `${booking.scheduled_date}T${timeStr}:00+08:00`;
      startTime = this.parseUTC(scheduledAt);
    } else if (booking.scheduled_at) {
      // 没有 date/time，fallback 到 scheduled_at
      scheduledAt = booking.scheduled_at;
      startTime = this.parseUTC(scheduledAt);
    } else {
      startTime = NaN;
    }
    
    if (!scheduledAt || !booking.duration_minutes || isNaN(startTime)) {
      return booking.status as SessionState || 'scheduled';
    }

    const endTime = startTime + booking.duration_minutes * 60 * 1000;
    const wrapUpTime = endTime + 5 * 60 * 1000; // 5分钟收尾期

    // 状态机（按顺序判断）
    if (now < startTime - 15 * 60 * 1000) {
      // 15分钟前：confirmed（已确认，等待中）
      return 'confirmed';
    }
    if (now < startTime) {
      // 15分钟内：upcoming（即将开始）
      return 'upcoming';
    }
    if (now < endTime) {
      // 开始到结束：in_progress
      return 'in_progress';
    }
    if (now < wrapUpTime) {
      // 结束后5分钟：ended（收尾期，可评价）
      return 'ended';
    }
    // 收尾期后：completed
    return 'completed';
  }

  // ==================== 业务判断 ====================

  /** 是否可以预约（至少提前15分钟） */
  static canBook(scheduledAt: string, now: number = this.now()): boolean {
    const startTime = this.parseUTC(scheduledAt);
    return !isNaN(startTime) && (startTime - now) >= 15 * 60 * 1000;
  }

  /** 是否可以修改预约（提前2小时以上） */
  static canReschedule(scheduledAt: string, now: number = this.now()): boolean {
    const startTime = this.parseUTC(scheduledAt);
    return !isNaN(startTime) && (startTime - now) > 2 * 60 * 60 * 1000;
  }

  /** 咨询是否已过期（用于 pending 订单） */
  static isExpired(booking: TimeBooking, now: number = this.now()): boolean {
    if (booking.status === 'cancelled' || booking.status === 'refunded' || booking.payment_status === 'cancelled') {
      return false;
    }
    if (booking.payment_status === 'expired') return true;
    if (booking.status !== 'pending' || !booking.expires_at) return false;
    return this.parseUTC(booking.expires_at) <= now;
  }

  /** 咨询是否已结束（超过程序+收尾期） */
  static isFinished(booking: TimeBooking, now: number = this.now()): boolean {
    const state = this.getSessionState(booking, now);
    return state === 'completed' || state === 'ended' || state === 'cancelled' || state === 'refunded';
  }

  /** 是否可以发送提醒（开始前15分钟窗口） */
  static canSendReminder(
    booking: TimeBooking,
    now: number = this.now(),
    windowMinutes: number = 15
  ): boolean {
    if (!booking.scheduled_at) return false;
    const startTime = this.parseUTC(booking.scheduled_at);
    const diff = startTime - now;
    // 15分钟前到开始后15分钟内的窗口
    return diff <= windowMinutes * 60 * 1000 && diff >= -windowMinutes * 60 * 1000;
  }

  // ==================== 显示格式化 ====================

  /** 统一双时区显示 */
  static formatDisplayTime(
    booking: TimeBooking,
    userTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
    advisorTimezone: string = 'Asia/Shanghai',
    locale: string = 'zh-CN'
  ): DisplayTimeResult | null {
    if (!booking.scheduled_at) return null;

    const d = new Date(booking.scheduled_at);
    const userLocal = this.formatInTimezone(booking.scheduled_at, userTimezone, locale);
    const advisorLocal = this.formatInTimezone(booking.scheduled_at, advisorTimezone, locale);

    return {
      userLocalTime: userLocal,
      userTimezone: this.getTimezoneShortName(userTimezone),
      advisorLocalTime: advisorLocal,
      advisorTimezone: this.getTimezoneShortName(advisorTimezone),
      isoString: d.toISOString(),
    };
  }

  /** 格式化预约时间显示（用于订单卡片）
   * 根据用户时区转换为当地时间显示，同时保留北京时间
   */
  static formatBookingTimeDisplay(
    booking: TimeBooking,
    options?: { showLocalTime?: boolean; targetTimezone?: string }
  ): string {
    const { scheduled_date, scheduled_time, timezone } = booking;

    if (!scheduled_date || !scheduled_time) return '';

    // 构建北京时间 ISO 字符串（师傅所在地）
    const timeStr = scheduled_time.split(':').slice(0, 2).join(':');
    const beijingIso = `${scheduled_date}T${timeStr}:00+08:00`;

    // 用户时区（如果没有则默认浏览器时区）
    const userTz = timezone || this.getDefaultTimezone();
    const userTzName = this.getTimezoneShortName(userTz);

    // 用户当地时间（转换后的）
    const userLocalTime = this.formatInTimezone(beijingIso, userTz, 'zh-CN');
    // 提取 "HH:mm" 部分
    const userTimeMatch = userLocalTime.match(/(\d{2}:\d{2})/);
    const userTime = userTimeMatch ? userTimeMatch[1] : scheduled_time;

    // 北京时间（原始）
    const beijingTime = timeStr;
    const beijingTzName = this.getTimezoneShortName('Asia/Shanghai');

    if (userTz === 'Asia/Shanghai') {
      // 用户在北京时区，直接显示北京时间
      return `${scheduled_date} ${beijingTime} (${beijingTzName})`;
    }

    // 非北京时区：显示用户当地时间 + 北京时间（双时区）
    return `${scheduled_date} ${userTime} (${userTzName}) / ${beijingTime} (${beijingTzName})`;
  }

  // ==================== 区间冲突检测 ====================

  /** 计算预约结束时间（毫秒） */
  static getBookingEndTime(startIso: string, durationMinutes: number): number {
    const startTime = this.parseUTC(startIso);
    return startTime + durationMinutes * 60 * 1000;
  }

  /** 检查时间段是否与现有订单冲突（区间重叠检测）
   * 冲突规则：(newStart < existingEnd) && (newEnd > existingStart)
   */
  static isSlotAvailable(
    newStartIso: string,
    newEndIso: string,
    existingBookings: Array<{ start: string; end: string }>
  ): boolean {
    const newStart = this.parseUTC(newStartIso);
    const newEnd = this.parseUTC(newEndIso);

    for (const booking of existingBookings) {
      const existingStart = this.parseUTC(booking.start);
      const existingEnd = this.parseUTC(booking.end);
      if (newStart < existingEnd && newEnd > existingStart) {
        return false; // 冲突
      }
    }
    return true;
  }

  /** 检查单个时段是否可用（基于现有订单的区间） */
  static isTimeSlotAvailable(
    slotTime: string,        // 'HH:MM' 或 'HH:MM:SS'
    date: string,            // 'YYYY-MM-DD'
    durationMinutes: number,
    existingBookings: Array<{ scheduled_time: string; duration_minutes: number }>
  ): boolean {
    // 统一格式为 HH:MM（去掉秒）
    const normalizedSlotTime = slotTime.slice(0, 5);
    const newStart = this.parseUTC(`${date}T${normalizedSlotTime}:00`);
    const newEnd = newStart + durationMinutes * 60 * 1000;

    for (const booking of existingBookings) {
      const normalizedBookingTime = booking.scheduled_time.slice(0, 5);
      const existingStart = this.parseUTC(`${date}T${normalizedBookingTime}:00`);
      const existingEnd = existingStart + (booking.duration_minutes || 30) * 60 * 1000;
      if (newStart < existingEnd && newEnd > existingStart) {
        return false; // 冲突
      }
    }
    return true;
  }

  /** 获取可用时段列表（排除区间重叠的已占用时段） */
  static getAvailableSlots(
    date: string,
    allSlots: string[],
    existingBookings: Array<{ scheduled_time: string; duration_minutes: number }>,
    minDurationMinutes: number = 25
  ): { availableSlots: string[]; occupiedSlots: string[] } {
    const available: string[] = [];
    const occupied: string[] = [];

    for (const slot of allSlots) {
      const slotStart = this.parseUTC(`${date}T${slot}:00`);
      const slotEnd = slotStart + minDurationMinutes * 60 * 1000;
      let isOccupied = false;

      for (const booking of existingBookings) {
        const normalizedBookingTime = booking.scheduled_time.slice(0, 5);
        const existingStart = this.parseUTC(`${date}T${normalizedBookingTime}:00`);
        const existingEnd = existingStart + (booking.duration_minutes || 30) * 60 * 1000;
        if (slotStart < existingEnd && slotEnd > existingStart) {
          isOccupied = true;
          break;
        }
      }

      if (isOccupied) {
        occupied.push(slot);
      } else {
        available.push(slot);
      }
    }

    return { availableSlots: available, occupiedSlots: occupied };
  }

  // ==================== 可用时段生成 ====================

  /** 生成可用时段（基于UTC，返回用户时区展示） */
  static generateTimeSlots(
    date: Date,
    startHour: number = 10,
    endHour: number = 22,
    intervalMinutes: number = 30,
    excludeSlots: string[] = []
  ): string[] {
    const slots: string[] = [];
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += intervalMinutes) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        if (!excludeSlots.includes(timeStr)) {
          slots.push(timeStr);
        }
      }
    }
    return slots;
  }

  // ==================== 辅助 ====================

  /** 获取浏览器/系统默认时区 */
  static getDefaultTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

// 兼容旧函数导出（逐步替换）
export const getConsultationDisplayStatus = TimeEngine.getSessionState.bind(TimeEngine);
export const isConsultationExpired = TimeEngine.isExpired.bind(TimeEngine);
export const formatBookingTimeDisplay = TimeEngine.formatBookingTimeDisplay.bind(TimeEngine);
export const getTimezoneShortName = TimeEngine.getTimezoneShortName.bind(TimeEngine);
export const formatInTimezone = TimeEngine.formatInTimezone.bind(TimeEngine);
