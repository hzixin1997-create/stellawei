'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
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
