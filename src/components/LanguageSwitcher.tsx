'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 确保 html lang 与当前语言同步
    if (i18n.language) {
      document.documentElement.lang = i18n.language;
    }
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
    // 显式写入 localStorage
    localStorage.setItem('language', newLang);
    // 写入 cookie（服务端读取用）
    document.cookie = `language=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`;
    // 同步更新 html lang 属性
    document.documentElement.lang = newLang;
  };

  if (!mounted) {
    return (
      <button className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium text-foreground/70 hover:text-stellawei-purple transition-colors">
        <Globe className="w-4 h-4" />
        <span>EN / 中</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium text-foreground/70 hover:text-stellawei-purple transition-colors"
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4" />
      <span>{t('language.en')} / {t('language.zh')}</span>
    </button>
  );
}
