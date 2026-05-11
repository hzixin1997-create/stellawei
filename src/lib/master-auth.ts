// 师傅邮箱白名单（黄总 16:55 确认）
// 统一登录体系，登录后查 email 是否在白名单
// 是则跳 /master/dashboard，否则跳 /user/dashboard

export const MASTER_WHITELIST = [
  {
    email: "mshoucangjia@gmail.com",
    name: "戊阳",
    slug: "wu-yang",
    specialties: ["八字命理", "风水咨询"],
    experience: "12年+"
  },
  {
    email: "qimenyihua@gmail.com",
    name: "张易桦",
    slug: "zhang-yihua",
    specialties: ["奇门遁甲", "六爻占卜"],
    experience: "8年"
  },
  {
    email: "lunalintarot@163.com",
    name: "Luna",
    slug: "master-luna",
    specialties: ["塔罗占卜"],
    experience: "10年+"
  }
];

// 检查邮箱是否是师傅
export function isMasterEmail(email: string): boolean {
  return MASTER_WHITELIST.some(master => master.email === email);
}

// 根据邮箱获取师傅信息
export function getMasterByEmail(email: string) {
  return MASTER_WHITELIST.find(master => master.email === email) || null;
}

// 登录后路由决策
export function getDashboardRoute(email: string): string {
  return isMasterEmail(email) ? '/master/dashboard' : '/user/dashboard';
}
