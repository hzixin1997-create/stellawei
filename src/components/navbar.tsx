import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./language-switcher";

interface NavbarProps {
  userEmail?: string;
  onLogout?: () => void;
}

export default function Navbar({ userEmail, onLogout }: NavbarProps) {
  const { i18n } = useTranslation();
  const router = useRouter();
  const isZh = i18n.language === "zh";

  return (
    <nav className="w-full bg-white/80 backdrop-blur-md border-b border-stone-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo + 返回首页 */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-violet-700 hover:text-violet-800 transition-colors">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span className="font-serif font-bold text-lg">出海命理</span>
            </Link>
          </div>

          {/* 右侧操作 */}
          <div className="flex items-center gap-4">
            {/* 返回首页按钮 */}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 transition-colors text-sm"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">{isZh ? "返回首页" : "Home"}</span>
            </Link>

            {/* 语言切换 - 精致 DropdownMenu 版 */}
            <LanguageSwitcher />

            {/* 用户邮箱 */}
            {userEmail && (
              <span className="text-sm text-stone-600 hidden sm:inline">
                {userEmail}
              </span>
            )}

            {/* 退出登录 */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-stone-600 hover:text-red-600 transition-colors text-sm border border-stone-300 rounded-lg px-3 py-1.5 hover:border-red-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{isZh ? "退出登录" : "Logout"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
