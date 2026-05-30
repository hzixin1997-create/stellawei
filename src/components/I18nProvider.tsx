'use client';

import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

interface I18nProviderProps {
  children: React.ReactNode;
  initialLang?: string;
}

export function I18nProvider({ children, initialLang }: I18nProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 如果服务端检测到的语言与 i18n 当前语言不同，同步一下
    if (initialLang && i18n.language !== initialLang) {
      i18n.changeLanguage(initialLang);
    }
    setMounted(true);
  }, [initialLang]);

  // 在客户端挂载前，先用服务端检测到的语言渲染
  // 这样可以避免 SSR/CSR 语言不匹配导致的闪变
  if (!mounted && initialLang) {
    // 临时设置语言，确保首次渲染与服务端一致
    if (i18n.language !== initialLang) {
      i18n.changeLanguage(initialLang);
    }
  }

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
