import Link from "next/link";
import { Home } from "lucide-react";

export default function BackToHome() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 transition-colors text-sm mb-4"
    >
      <Home className="w-4 h-4" />
      返回首页
    </Link>
  );
}
