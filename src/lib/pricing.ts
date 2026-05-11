// 定价策略配置（黄总 16:55 最终确认）
// 平台抽成30%，师傅到手70%

export const PRICING_CONFIG = {
  platformFee: 0.30, // 30%
  masterFee: 0.70,    // 70%
};

export const MASTER_PRICING = {
  luna: {
    name: "Luna",
    tiers: {
      trial: { price: 9.9, name: "引流体验" },
      basic: { price: 28, name: "基础咨询" },
      deep: { price: 55, name: "深度咨询" },
      fengshui: null, // Luna不做风水
    }
  },
  zhang_yihua: {
    name: "张易桦",
    tiers: {
      trial: { price: 9.9, name: "引流体验" },
      basic: { price: 38, name: "基础咨询" },
      deep: { price: 68, name: "深度咨询" },
      fengshui: null, // 不做风水
    }
  },
  wu_yang: {
    name: "戊阳",
    tiers: {
      trial: { price: 9.9, name: "引流体验" },
      basic: { price: 48, name: "基础咨询" },
      deep: { price: 78, name: "深度咨询" },
      fengshui: { price: 95, name: "风水专项" },
    }
  }
};

// Stripe Products/Prices 创建参考
export const STRIPE_PRODUCTS = [
  { id: 'trial_luna', name: '引流体验 - Luna', price: 990, master: 'luna', tier: 'trial' },
  { id: 'basic_luna', name: '基础咨询 - Luna', price: 2800, master: 'luna', tier: 'basic' },
  { id: 'deep_luna', name: '深度咨询 - Luna', price: 5500, master: 'luna', tier: 'deep' },
  { id: 'trial_zhang', name: '引流体验 - 张易桦', price: 990, master: 'zhang_yihua', tier: 'trial' },
  { id: 'basic_zhang', name: '基础咨询 - 张易桦', price: 3800, master: 'zhang_yihua', tier: 'basic' },
  { id: 'deep_zhang', name: '深度咨询 - 张易桦', price: 6800, master: 'zhang_yihua', tier: 'deep' },
  { id: 'trial_wu', name: '引流体验 - 戊阳', price: 990, master: 'wu_yang', tier: 'trial' },
  { id: 'basic_wu', name: '基础咨询 - 戊阳', price: 4800, master: 'wu_yang', tier: 'basic' },
  { id: 'deep_wu', name: '深度咨询 - 戊阳', price: 7800, master: 'wu_yang', tier: 'deep' },
  { id: 'fengshui_wu', name: '风水专项 - 戊阳', price: 9500, master: 'wu_yang', tier: 'fengshui' },
];
