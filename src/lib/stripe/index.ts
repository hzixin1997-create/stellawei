import Stripe from 'stripe'

// 延迟初始化 Stripe 客户端
let stripeInstance: Stripe | null = null

export const getStripe = (): Stripe => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) throw new Error('Missing STRIPE_SECRET_KEY')
    stripeInstance = new Stripe(secretKey, { apiVersion: '2024-06-20' })
  }
  return stripeInstance
}

// 向后兼容的 stripe 实例
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) { return getStripe()[prop as keyof Stripe] }
})

export const getStripePublishableKey = () =>
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

// 金额转 Stripe 最小单位（分）
export const convertToStripeAmount = (amount: number, currency = 'usd'): number => {
  const zeroDecimal = ['jpy', 'krw', 'vnd', 'clp']
  return zeroDecimal.includes(currency.toLowerCase())
    ? Math.round(amount)
    : Math.round(amount * 100)
}

// ===== 新增：定价配置 =====
export const STRIPE_PRICE_IDS: Record<string, string> = {
  'trial_luna': process.env.STRIPE_PRICE_TRIAL_LUNA || '',
  'trial_zhang': process.env.STRIPE_PRICE_TRIAL_ZHANG || '',
  'trial_wu': process.env.STRIPE_PRICE_TRIAL_WU || '',
  'basic_luna': process.env.STRIPE_PRICE_BASIC_LUNA || '',
  'basic_zhang': process.env.STRIPE_PRICE_BASIC_ZHANG || '',
  'basic_wu': process.env.STRIPE_PRICE_BASIC_WU || '',
  'deep_luna': process.env.STRIPE_PRICE_DEEP_LUNA || '',
  'deep_zhang': process.env.STRIPE_PRICE_DEEP_ZHANG || '',
  'deep_wu': process.env.STRIPE_PRICE_DEEP_WU || '',
  'fengshui_wu': process.env.STRIPE_PRICE_FENGSHUI_WU || '',
}

export function getPriceId(masterSlug: string, tier: string): string {
  return STRIPE_PRICE_IDS[`${tier}_${masterSlug}`] || ''
}

// ===== 新增：创建 Checkout Session =====
export async function createCheckoutSession(params: {
  priceId: string
  consultationId: string
  successUrl: string
  cancelUrl: string
}) {
  return getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: params.priceId, quantity: 1 }],
    metadata: { consultationId: params.consultationId },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  })
}
