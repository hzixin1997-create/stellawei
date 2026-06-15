/**
 * 聊天离线消息队列
 * 用于弱网/断网时暂存消息，网络恢复后自动重试
 */

const QUEUE_KEY = 'stellawei_chat_offline_queue'

export interface OfflineMessage {
  id: string
  bookingId: string
  content: string | null
  image_url: string | null
  audio_url: string | null
  audio_duration: number | null
  sender_type: 'user' | 'master'
  sender_name: string
  sender_id: string
  created_at: string
  attempts: number
  lastError?: string
}

/**
 * 获取当前 booking 的离线消息队列
 */
export function getOfflineQueue(bookingId: string): OfflineMessage[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return all[bookingId] || []
  } catch {
    return []
  }
}

/**
 * 添加消息到离线队列
 */
export function addToOfflineQueue(bookingId: string, msg: OfflineMessage): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const all = raw ? JSON.parse(raw) : {}
    if (!all[bookingId]) all[bookingId] = []
    all[bookingId].push(msg)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(all))
  } catch (e) {
    console.error('[offlineQueue] add failed:', e)
  }
}

/**
 * 从队列中移除指定消息
 */
export function removeFromOfflineQueue(bookingId: string, msgId: string): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const all = raw ? JSON.parse(raw) : {}
    if (!all[bookingId]) return
    all[bookingId] = all[bookingId].filter((m: OfflineMessage) => m.id !== msgId)
    localStorage.setItem(QUEUE_KEY, JSON.stringify(all))
  } catch (e) {
    console.error('[offlineQueue] remove failed:', e)
  }
}

/**
 * 更新队列中的消息（如增加重试次数）
 */
export function updateOfflineQueue(bookingId: string, msgId: string, updates: Partial<OfflineMessage>): void {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const all = raw ? JSON.parse(raw) : {}
    if (!all[bookingId]) return
    const idx = all[bookingId].findIndex((m: OfflineMessage) => m.id === msgId)
    if (idx >= 0) {
      all[bookingId][idx] = { ...all[bookingId][idx], ...updates }
      localStorage.setItem(QUEUE_KEY, JSON.stringify(all))
    }
  } catch (e) {
    console.error('[offlineQueue] update failed:', e)
  }
}

/**
 * 清理所有离线队列（可选）
 */
export function clearOfflineQueue(bookingId?: string): void {
  try {
    if (bookingId) {
      const raw = localStorage.getItem(QUEUE_KEY)
      const all = raw ? JSON.parse(raw) : {}
      delete all[bookingId]
      localStorage.setItem(QUEUE_KEY, JSON.stringify(all))
    } else {
      localStorage.removeItem(QUEUE_KEY)
    }
  } catch (e) {
    console.error('[offlineQueue] clear failed:', e)
  }
}

/**
 * 检查网络是否在线
 */
export function isNetworkOnline(): boolean {
  return navigator.onLine
}

/**
 * 监听网络状态变化
 */
export function onNetworkChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)
  
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
