'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronRight, Star } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { TopicData } from "@/lib/knowledge-data";

interface NavHeaderProps {
  topic: TopicData;
}

export function NavHeader({ topic }: NavHeaderProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-sw-accent flex items-center justify-center">
              <Star className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-serif font-bold text-white">{t('brand')}</span>
          </Link>
          <div className="flex items-center space-x-3 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white transition-colors">
              {isZh ? '首页' : 'Home'}
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <Link href="/knowledge" className="text-gray-400 hover:text-white transition-colors">
              {isZh ? '知识库' : 'Knowledge'}
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <Link
              href={`/knowledge/${topic.slug}`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isZh ? topic.nameCn : topic.name}
            </Link>
            <div className="ml-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
