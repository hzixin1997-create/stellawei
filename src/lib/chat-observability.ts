/**
 * Chat Observability — 可观测性工具函数
 * 包含：Request ID 生成、事件日志记录、API 耗时监控
 * 2026-07-13
 */

import { createClient } from '@supabase/supabase-js';

// 直接使用 service_role key 创建客户端，避免依赖 next/headers
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================
// 1. Request ID 生成
// ============================================
export function generateRequestId(): string {
  return crypto.randomUUID();
}

// ============================================
// 2. 事件日志记录（不记录聊天内容，只记录行为）
// ============================================
export interface ChatEventPayload {
  booking_id: string;
  request_id?: string;
  role: 'user' | 'master';
  event_type: string;
  duration_ms?: number;
  error_code?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export async function logChatEvent(payload: ChatEventPayload): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from('chat_events').insert({
      booking_id: payload.booking_id,
      request_id: payload.request_id || null,
      role: payload.role,
      event_type: payload.event_type,
      duration_ms: payload.duration_ms || null,
      error_code: payload.error_code || null,
      error_message: payload.error_message || null,
      metadata: payload.metadata || null,
    });
  } catch (e) {
    // 事件日志失败不应该影响主流程
    console.error('[chat:observability] logChatEvent failed:', e);
  }
}

// ============================================
// 3. API 耗时监控
// ============================================
export interface ApiDurationPayload {
  request_id: string;
  booking_id?: string;
  endpoint: string;
  method: string;
  start_time: Date;
  end_time?: Date;
  duration_ms?: number;
  status_code?: number;
  error_type?: string;
}

export async function logApiDuration(payload: ApiDurationPayload): Promise<void> {
  try {
    const supabase = getServiceClient();
    await supabase.from('api_durations').insert({
      request_id: payload.request_id,
      booking_id: payload.booking_id || null,
      endpoint: payload.endpoint,
      method: payload.method,
      start_time: payload.start_time.toISOString(),
      end_time: payload.end_time?.toISOString() || null,
      duration_ms: payload.duration_ms || null,
      status_code: payload.status_code || null,
      error_type: payload.error_type || null,
    });
  } catch (e) {
    console.error('[chat:observability] logApiDuration failed:', e);
  }
}

// ============================================
// 4. 带 Request ID 和耗时监控的 fetch 包装
// ============================================
export interface FetchWithObservabilityOptions extends RequestInit {
  bookingId?: string;
  role?: 'user' | 'master';
  requestId?: string;
  timeout?: number;
}

export async function fetchWithObservability(
  url: string,
  options: FetchWithObservabilityOptions = {}
): Promise<Response> {
  const requestId = options.requestId || generateRequestId();
  const startTime = new Date();
  const endpoint = url;
  const method = options.method || 'POST';
  const { bookingId, role, timeout = 10000, ...fetchOptions } = options;

  // 发送事件：请求开始
  if (bookingId && role) {
    logChatEvent({
      booking_id: bookingId,
      request_id: requestId,
      role,
      event_type: 'ApiRequest',
      metadata: { endpoint, method, timeout },
    }).catch(() => {});
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        ...fetchOptions.headers,
        'X-Request-ID': requestId,
      },
    });

    clearTimeout(timeoutId);
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    // 记录 API 耗时
    await logApiDuration({
      request_id: requestId,
      booking_id: bookingId,
      endpoint,
      method,
      start_time: startTime,
      end_time: endTime,
      duration_ms: durationMs,
      status_code: response.status,
    });

    // 发送事件：请求成功
    if (bookingId && role) {
      logChatEvent({
        booking_id: bookingId,
        request_id: requestId,
        role,
        event_type: response.ok ? 'ApiSuccess' : 'ApiError',
        duration_ms: durationMs,
        error_code: response.ok ? undefined : `HTTP_${response.status}`,
        metadata: { endpoint, method, status_code: response.status },
      }).catch(() => {});
    }

    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    const errorType = error.name === 'AbortError' ? 'timeout' : 'network';
    const errorCode = error.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';

    // 记录 API 耗时（失败情况）
    await logApiDuration({
      request_id: requestId,
      booking_id: bookingId,
      endpoint,
      method,
      start_time: startTime,
      end_time: endTime,
      duration_ms: durationMs,
      error_type: errorType,
    });

    // 发送事件：请求失败
    if (bookingId && role) {
      logChatEvent({
        booking_id: bookingId,
        request_id: requestId,
        role,
        event_type: errorType === 'timeout' ? 'ApiTimeout' : 'ApiError',
        duration_ms: durationMs,
        error_code: errorCode,
        error_message: error.message,
        metadata: { endpoint, method },
      }).catch(() => {});
    }

    throw error;
  }
}

// ============================================
// 5. 快速记录事件（用于前端）
// ============================================
export function quickLogEvent(
  bookingId: string,
  role: 'user' | 'master',
  eventType: string,
  metadata?: Record<string, any>
): void {
  logChatEvent({
    booking_id: bookingId,
    role,
    event_type: eventType,
    metadata,
  }).catch(() => {});
}

// ============================================
// 6. 前端可用的事件类型常量
// ============================================
export const ChatEventTypes = {
  // 连接状态
  CHAT_CONNECTED: 'ChatConnected',
  REALTIME_DISCONNECTED: 'RealtimeDisconnected',
  RECONNECT_SUCCESS: 'ReconnectSuccess',
  RECONNECT_FAILED: 'ReconnectFailed',

  // 发送流程
  SEND_START: 'SendStart',
  API_REQUEST: 'ApiRequest',
  API_SUCCESS: 'ApiSuccess',
  API_TIMEOUT: 'ApiTimeout',
  API_ERROR: 'ApiError',

  // 上传流程
  UPLOAD_IMAGE_START: 'UploadImageStart',
  UPLOAD_IMAGE_SUCCESS: 'UploadImageSuccess',
  UPLOAD_IMAGE_FAILED: 'UploadImageFailed',
  UPLOAD_AUDIO_START: 'UploadAudioStart',
  UPLOAD_AUDIO_SUCCESS: 'UploadAudioSuccess',
  UPLOAD_AUDIO_FAILED: 'UploadAudioFailed',

  // 权限
  PERMISSION_GRANTED: 'PermissionGranted',
  PERMISSION_DENIED: 'PermissionDenied',

  // 页面可见性
  PAGE_HIDDEN: 'PageHidden',
  PAGE_VISIBLE: 'PageVisible',

  // 其他
  TYPING_START: 'TypingStart',
  MESSAGE_READ: 'MessageRead',
} as const;

export type ChatEventType = typeof ChatEventTypes[keyof typeof ChatEventTypes];
