import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarot Reading | Stellawei - Professional Fortune Telling",
  description: "Discover clarity through Tarot readings. Love, career, and spiritual guidance from certified tarot masters. Book your session today.",
  alternates: {
    canonical: "https://stellawei.org/services/tarot",
  },
  openGraph: {
    title: "Tarot Reading | Stellawei",
    description: "Discover clarity through Tarot readings. Love, career, and spiritual guidance from certified tarot masters.",
    url: "https://stellawei.org/services/tarot",
    siteName: "Stellawei",
    locale: "en_US",
    type: "website",
  },
};

export default function TarotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
