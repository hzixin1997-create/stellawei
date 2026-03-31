import Stripe from 'stripe'

// 延迟初始化 Stripe 客户端，避免在构建时抛出错误
let stripeInstance: Stripe | null = null

export const getStripe = (): Stripe => {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    
    if (!secretKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    
    stripeInstance = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    })
  }
  
  return stripeInstance
}

// 导出 stripe 实例（向后兼容）
export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    return getStripe()[prop as keyof Stripe]
  }
})

export const getStripePublishableKey = () => {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
}

// 辅助函数：将金额转换为 Stripe 最小货币单位（分）
export const convertToStripeAmount = (amount: number, currency: string = 'usd'): number => {
  // Stripe 需要以最小货币单位表示金额（如美分）
  // 对于没有小数位的货币（如 JPY），Stripe 需要原金额
  const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp', 'pyg', 'xaf', 'xof', 'bif', 'djf', 'gnf', 'kmf', 'mga', 'rwf', 'xpf']
  
  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return Math.round(amount)
  }
  
  return Math.round(amount * 100)
}

// 辅助函数：计算实际价格（首次用户优惠）
export const calculatePrice = async (
  supabase: any,
  userId: string,
  servicePrice: number
): Promise<{ finalPrice: number; isFirstTime: boolean }> => {
  // 查询用户是否有已完成的历史预约
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (!error && bookings && bookings.length > 0) {
    return { finalPrice: servicePrice, isFirstTime: false }
  }

  // 首次用户享受 $9.9 优惠价格
  return { finalPrice: 9.9, isFirstTime: true }
}
