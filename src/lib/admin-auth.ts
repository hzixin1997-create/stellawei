/**
 * 统一管理员/师傅认证配置
 * 集中管理权限，避免散落在各个文件中
 */

// 总裁邮箱白名单
export const ADMIN_EMAILS = [
  'hzixin1997@gmail.com',
  'zixihuang@foxmail.com',
]

// 师傅邮箱白名单（从 master-auth.ts 同步，这里只引用判断逻辑）
import { isMasterEmail } from './master-auth'

export { isMasterEmail }

// 检查是否是管理员
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

// 角色类型
export type UserRole = 'admin' | 'master' | 'user' | 'guest'

// 根据邮箱判断角色
export function getUserRole(email: string | null | undefined): UserRole {
  if (!email) return 'guest'
  if (isAdminEmail(email)) return 'admin'
  if (isMasterEmail(email)) return 'master'
  return 'user'
}
