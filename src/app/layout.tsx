import { headers } from 'next/headers';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Stellawei - Professional Fortune Telling & Spiritual Guidance",
  description: "Real human masters for Tarot, BaZi, Feng Shui, and spiritual guidance. Transparent fixed pricing, verified credentials, and a 7-day money-back guarantee.",
  keywords: "fortune telling, tarot reading, bazi analysis, feng shui, spiritual guidance, qi men dun jia, liu yao, astrology, chinese metaphysics",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  robots: "index, follow",
  openGraph: {
    title: "Stellawei - Professional Fortune Telling & Spiritual Guidance",
    description: "Real human masters for Tarot, BaZi, Feng Shui, and spiritual guidance. Transparent fixed pricing, verified credentials.",
    url: "https://stellawei.org",
    siteName: "Stellawei",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stellawei - Professional Fortune Telling",
    description: "Real human masters for spiritual guidance. Transparent fixed pricing, verified credentials.",
  },
  alternates: {
    canonical: "https://stellawei.org",
  },
};

function detectLanguageFromHeaders(): string {
  const headersList = headers();
  
  // 1. 检查 cookie
  const cookie = headersList.get('cookie') || '';
  const langMatch = cookie.match(/language=([^;]+)/);
  if (langMatch) {
    const lang = langMatch[1].trim();
    if (lang === 'zh' || lang === 'en') return lang;
  }
  
  // 2. 检查 Accept-Language
  const acceptLang = headersList.get('accept-language') || '';
  if (acceptLang.includes('zh')) return 'zh';
  if (acceptLang.includes('en')) return 'en';
  
  // 3. 默认英文
  return 'en';
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = detectLanguageFromHeaders();
  
  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider initialLang={lang}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
