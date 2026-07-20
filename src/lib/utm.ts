/**
 * UTM Attribution - First Touch + Last Touch
 * 
 * Storage: localStorage (primary) + cookie (backup)
 * Keys:
 *   - utm_first: { source, medium, campaign, content, term, timestamp }
 *   - utm_last: { source, medium, campaign, content, term, timestamp }
 */

export interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface UTMRecord extends UTMParams {
  timestamp: number;
}

const STORAGE_KEY_FIRST = 'sw_utm_first';
const STORAGE_KEY_LAST = 'sw_utm_last';

/**
 * 从当前 URL 解析 UTM 参数
 */
export function getUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const result: UTMParams = {};
  
  const source = params.get('utm_source');
  const medium = params.get('utm_medium');
  const campaign = params.get('utm_campaign');
  const content = params.get('utm_content');
  const term = params.get('utm_term');
  
  if (source) result.source = source;
  if (medium) result.medium = medium;
  if (campaign) result.campaign = campaign;
  if (content) result.content = content;
  if (term) result.term = term;
  
  return result;
}

/**
 * 检查当前 URL 是否包含 UTM 参数
 */
export function hasUTMParams(): boolean {
  const utm = getUTMParams();
  return Object.keys(utm).length > 0;
}

/**
 * 获取 First Touch（首次访问的 UTM）
 */
export function getFirstTouch(): UTMRecord | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_FIRST);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('[UTM] Failed to parse first touch:', e);
  }
  return null;
}

/**
 * 获取 Last Touch（最近一次带 UTM 的访问）
 */
export function getLastTouch(): UTMRecord | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_LAST);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('[UTM] Failed to parse last touch:', e);
  }
  return null;
}

/**
 * 获取完整归因数据（First + Last）
 */
export function getAttribution(): {
  firstTouch: UTMRecord | null;
  lastTouch: UTMRecord | null;
  current: UTMParams;
} {
  return {
    firstTouch: getFirstTouch(),
    lastTouch: getLastTouch(),
    current: getUTMParams(),
  };
}

/**
 * 初始化 UTM 归因
 * - 如果 URL 有 UTM 参数：更新 Last Touch，如果无 First Touch 则设置 First Touch
 * - 如果 URL 无 UTM 参数：不做任何操作
 * 
 * 应在应用初始化时调用一次（如 layout.tsx 或 page.tsx）
 */
export function initUTMAttribution(): void {
  if (typeof window === 'undefined') return;
  
  const current = getUTMParams();
  if (Object.keys(current).length === 0) return;
  
  const record: UTMRecord = {
    ...current,
    timestamp: Date.now(),
  };
  
  // 更新 Last Touch（始终更新）
  try {
    localStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(record));
  } catch (e) {
    console.warn('[UTM] Failed to save last touch:', e);
  }
  
  // 设置 First Touch（仅当不存在时）
  const firstTouch = getFirstTouch();
  if (!firstTouch) {
    try {
      localStorage.setItem(STORAGE_KEY_FIRST, JSON.stringify(record));
    } catch (e) {
      console.warn('[UTM] Failed to save first touch:', e);
    }
  }
}

/**
 * 将 UTM 参数转换为 GA4 事件参数格式
 * 
 * 输出格式:
 * {
 *   utm_source_first: 'google',
 *   utm_medium_first: 'cpc',
 *   utm_campaign_first: 'july-promo',
 *   utm_source_last: 'instagram',
 *   utm_medium_last: 'social',
 *   ...
 * }
 */
export function getUTMEventParams(): Record<string, string> {
  const first = getFirstTouch();
  const last = getLastTouch();
  const params: Record<string, string> = {};
  
  if (first) {
    if (first.source) params.utm_source_first = first.source;
    if (first.medium) params.utm_medium_first = first.medium;
    if (first.campaign) params.utm_campaign_first = first.campaign;
    if (first.content) params.utm_content_first = first.content;
    if (first.term) params.utm_term_first = first.term;
  }
  
  if (last) {
    if (last.source) params.utm_source_last = last.source;
    if (last.medium) params.utm_medium_last = last.medium;
    if (last.campaign) params.utm_campaign_last = last.campaign;
    if (last.content) params.utm_content_last = last.content;
    if (last.term) params.utm_term_last = last.term;
  }
  
  return params;
}

/**
 * 清除 UTM 存储（用于测试或用户主动重置）
 */
export function clearUTMStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_FIRST);
  localStorage.removeItem(STORAGE_KEY_LAST);
}

/**
 * 获取用于 API 请求的 UTM 数据（如创建订单时发送到后端）
 */
export function getUTMForAPI(): {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_first_touch?: UTMRecord;
  utm_last_touch?: UTMRecord;
} {
  const first = getFirstTouch();
  const last = getLastTouch();
  const result: ReturnType<typeof getUTMForAPI> = {};
  
  // 优先使用 Last Touch 的 source/medium/campaign
  if (last) {
    if (last.source) result.utm_source = last.source;
    if (last.medium) result.utm_medium = last.medium;
    if (last.campaign) result.utm_campaign = last.campaign;
    if (last.content) result.utm_content = last.content;
    if (last.term) result.utm_term = last.term;
  } else if (first) {
    if (first.source) result.utm_source = first.source;
    if (first.medium) result.utm_medium = first.medium;
    if (first.campaign) result.utm_campaign = first.campaign;
    if (first.content) result.utm_content = first.content;
    if (first.term) result.utm_term = first.term;
  }
  
  if (first) result.utm_first_touch = first;
  if (last) result.utm_last_touch = last;
  
  return result;
}
