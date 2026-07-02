/**
 * 聊天消息加密工具
 * 使用 AES-GCM 进行端到端加密
 * 每个 booking（咨询会话）有独立的加密密钥
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // GCM recommended IV length

/**
 * 生成随机的 AES-256-GCM 密钥
 */
export async function generateChatKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

/**
 * 将 CryptoKey 导出为 base64 字符串（用于传输/存储）
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return arrayBufferToBase64(raw)
}

/**
 * 从 base64 字符串导入 CryptoKey
 */
export async function importKey(base64Key: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(base64Key)
  return await crypto.subtle.importKey(
    'raw',
    raw,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密消息内容
 */
export async function encryptMessage(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)

  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: (iv.buffer as unknown) as ArrayBuffer },
    key,
    encoded
  )

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  }
}

/**
 * 解密消息内容
 */
export async function decryptMessage(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const encrypted = base64ToArrayBuffer(ciphertext)
  const ivBytes = base64ToArrayBuffer(iv)

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: (ivBytes as unknown) as ArrayBuffer },
    key,
    encrypted
  )

  return new TextDecoder().decode(decrypted)
}

// ===== Helpers =====

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * 本地存储管理：每个 booking 的密钥
 */
const CHAT_KEYS_PREFIX = 'stellawei_chat_key:'

export function storeChatKey(bookingId: string, keyBase64: string): void {
  try {
    localStorage.setItem(`${CHAT_KEYS_PREFIX}${bookingId}`, keyBase64)
  } catch (e) {
    console.error('[chatCrypto] storeChatKey failed:', e)
  }
}

export function getChatKey(bookingId: string): string | null {
  try {
    return localStorage.getItem(`${CHAT_KEYS_PREFIX}${bookingId}`)
  } catch {
    return null
  }
}

export function removeChatKey(bookingId: string): void {
  try {
    localStorage.removeItem(`${CHAT_KEYS_PREFIX}${bookingId}`)
  } catch {
    // ignore
  }
}

/**
 * 通用：解密单条消息内容
 * 检查是否为加密格式，自动获取密钥并解密，失败时返回原始内容
 */
export async function decryptChatMessageContent(
  content: string | null,
  bookingId: string
): Promise<string> {
  if (!content) return ''
  try {
    const parsed = JSON.parse(content)
    if (parsed.enc && parsed.data && parsed.iv) {
      let keyBase64 = getChatKey(bookingId)
      if (!keyBase64) {
        // 本地没有密钥，尝试从 API 获取
        try {
          const keyRes = await fetch(`/api/chat/${bookingId}/key`)
          const keyData = await keyRes.json()
          if (keyData.key) {
            keyBase64 = keyData.key
            storeChatKey(bookingId, keyData.key)
          }
        } catch (e) {
          console.error('[decryptChatMessageContent] fetch key error:', e)
        }
      }
      if (!keyBase64) return content
      const key = await importKey(keyBase64)
      return await decryptMessage(key, parsed.data, parsed.iv)
    }
  } catch {
    // 不是加密格式，返回原始内容
  }
  return content
}

/**
 * 通用：批量解密消息列表
 */
export async function decryptChatMessages(
  messages: Array<{ content: string | null; booking_id?: string }>,
  bookingId?: string
): Promise<Array<any>> {
  return Promise.all(
    messages.map(async (msg) => {
      if (!msg.content) return msg
      const id = bookingId || msg.booking_id || ''
      if (!id) return msg
      const decrypted = await decryptChatMessageContent(msg.content, id)
      return { ...msg, content: decrypted }
    })
  )
}
