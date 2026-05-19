'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Crown,
  ChevronRight,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: '概览', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: '订单管理', href: '/admin/orders', icon: ShoppingCart },
  { label: '师傅管理', href: '/admin/masters', icon: Users },
  { label: '评价审核', href: '/admin/reviews', icon: Star },
  { label: '财务管理', href: '/admin/finance', icon: Crown },
  { label: '设置', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* 左侧导航栏 */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col fixed h-full z-20">
        <div className="px-6 py-5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stellawei-purple flex items-center justify-center">
              <Crown size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-800">总裁后台</h2>
              <p className="text-xs text-stone-400">Stellawei Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-stellawei-purple/10 text-stellawei-purple'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                )}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight size={14} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-colors w-full"
          >
            <LogOut size={18} />
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 ml-64">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
