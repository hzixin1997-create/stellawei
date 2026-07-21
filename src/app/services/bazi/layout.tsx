import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BaZi & Eastern Divination | Stellawei - Professional Fortune Telling",
  description: "Unlock your destiny with BaZi, Qi Men Dun Jia, and Liu Yao divination. 12+ years experience. Career, wealth, relationship, and health insights.",
  alternates: {
    canonical: "https://stellawei.org/services/bazi",
  },
  openGraph: {
    title: "BaZi & Eastern Divination | Stellawei",
    description: "Unlock your destiny with BaZi, Qi Men Dun Jia, and Liu Yao divination. 12+ years experience.",
    url: "https://stellawei.org/services/bazi",
    siteName: "Stellawei",
    locale: "en_US",
    type: "website",
  },
};

export default function BaziLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
