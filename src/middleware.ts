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
]

// Define auth routes (redirect to user dashboard if already logged in)
const authRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const { supabase } = createClient(request, response)
  
  // Refresh session if expired - required for Server Components to work
  const { data: { session }, error } = await supabase.auth.getSession()

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
