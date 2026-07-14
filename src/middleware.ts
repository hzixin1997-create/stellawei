import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware'

// Define protected routes that require authentication
const protectedRoutes = [
  '/profile',
  '/bookings',
  '/settings',
  '/orders',
  '/appointments',
  '/user/dashboard',   // 新增：用户后台需要登录
  '/chat',             // 新增：聊天页面需要登录
  '/master/dashboard', // 新增：师傅后台需要登录
  '/master/orders',    // 新增：师傅订单需要登录
  '/admin',            // 新增：总裁后台需要登录
]

// Define auth routes (redirect to user dashboard if already logged in)
const authRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]

// 带超时的 getSession 包装函数
async function getSessionWithTimeout(
  supabase: any,
  timeoutMs: number = 5000
): Promise<{ session: any | null; error: any | null }> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Supabase session timeout')), timeoutMs)
  })

  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      timeoutPromise,
    ])
    return result?.data ? { session: result.data.session, error: null } : { session: null, error: null }
  } catch (err: any) {
    console.warn('Supabase session check timed out, allowing request through:', err.message)
    return { session: null, error: err }
  }
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { pathname } = request.nextUrl

  // Staging 环境：禁止搜索引擎，返回 robots.txt
  if (process.env.NEXT_PUBLIC_ENV === 'staging' && pathname === '/robots.txt') {
    return new NextResponse('User-agent: *\nDisallow: /', {
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  const { supabase } = createClient(request, response)
  
  // Refresh session if expired - with timeout protection
  const { session } = await getSessionWithTimeout(supabase, 5000)

  const { pathname } = request.nextUrl

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Check if the route is an auth route
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users from auth routes to user dashboard
  if (isAuthRoute && session) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || '/user/dashboard'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
