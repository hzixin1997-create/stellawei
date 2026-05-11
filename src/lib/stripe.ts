import Stripe from 'stripe';

// Stripe 配置
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// 前端用的 publishable key
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

// 根据定价表创建的产品 ID 映射
// 需要在 Stripe Dashboard 中按 pricing.ts 的定价手动创建 Products/Prices
export const STRIPE_PRICE_IDS: Record<string, string> = {
  // 引流体验
  'trial_luna': process.env.STRIPE_PRICE_TRIAL_LUNA || '',
  'trial_zhang': process.env.STRIPE_PRICE_TRIAL_ZHANG || '',
  'trial_wu': process.env.STRIPE_PRICE_TRIAL_WU || '',
  
  // 基础咨询
  'basic_luna': process.env.STRIPE_PRICE_BASIC_LUNA || '',
  'basic_zhang': process.env.STRIPE_PRICE_BASIC_ZHANG || '',
  'basic_wu': process.env.STRIPE_PRICE_BASIC_WU || '',
  
  // 深度咨询
  'deep_luna': process.env.STRIPE_PRICE_DEEP_LUNA || '',
  'deep_zhang': process.env.STRIPE_PRICE_DEEP_ZHANG || '',
  'deep_wu': process.env.STRIPE_PRICE_DEEP_WU || '',
  
  // 风水专项（仅戊阳）
  'fengshui_wu': process.env.STRIPE_PRICE_FENGSHUI_WU || '',
};

// 获取价格 ID
export function getPriceId(masterSlug: string, tier: string): string {
  const key = `${tier}_${masterSlug}`;
  return STRIPE_PRICE_IDS[key] || '';
}

// 创建 Checkout Session
export async function createCheckoutSession(params: {
  priceId: string;
  consultationId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { priceId, consultationId, successUrl, cancelUrl } = params;
  
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      consultationId,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  
  return session;
}
