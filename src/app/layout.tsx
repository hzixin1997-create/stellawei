import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Stellawei - Professional Fortune Telling & Spiritual Guidance",
  description: "Connect with experienced masters for Tarot, BaZi, Feng Shui, and spiritual guidance. Professional fortune telling services blending Eastern and Western wisdom.",
  keywords: "fortune telling, tarot reading, bazi analysis, feng shui, spiritual guidance, qi men dun jia, liu yao, astrology, chinese metaphysics",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  robots: "index, follow",
  openGraph: {
    title: "Stellawei - Professional Fortune Telling & Spiritual Guidance",
    description: "Connect with experienced masters for Tarot, BaZi, Feng Shui, and spiritual guidance.",
    url: "https://stellawei.org",
    siteName: "Stellawei",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stellawei - Professional Fortune Telling",
    description: "Connect with experienced masters for spiritual guidance.",
  },
  alternates: {
    canonical: "https://stellawei.org",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
