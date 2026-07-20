'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';

const GA_MEASUREMENT_ID = 'G-MC61YGF78P';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const isStaging = process.env.NEXT_PUBLIC_ENV === 'staging';

  // 发送 SPA 页面浏览
  useEffect(() => {
    if (isStaging) return;
    if (pathname) {
      trackPageView(pathname, document.title, window.location.href);
    }
  }, [pathname, isStaging]);

  if (isStaging) return null;
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            page_location: window.location.href,
          });
        `}
      </Script>
    </>
  );
}
