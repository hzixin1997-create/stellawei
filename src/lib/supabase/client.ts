import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // SSR 阶段始终返回 mock 客户端，避免 createBrowserClient 崩溃
  if (typeof window === 'undefined') {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => {
        const chainable = {
          select: () => chainable,
          eq: () => chainable,
          in: () => chainable,
          not: () => chainable,
          limit: () => chainable,
          order: () => chainable,
          insert: async () => ({ data: null, error: null }),
          update: () => chainable,
          delete: () => chainable,
          single: async () => ({ data: null, error: null }),
        }
        return chainable
      },
    } as any
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createBrowserClient(url, key)
}
