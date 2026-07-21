import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spiritual Guidance | Stellawei - Energy Healing & Meditation",
  description: "Spiritual growth, energy healing, and guided meditation sessions. Connect with your higher self and discover your life purpose.",
  alternates: {
    canonical: "https://stellawei.org/services/spiritual",
  },
  openGraph: {
    title: "Spiritual Guidance | Stellawei",
    description: "Spiritual growth, energy healing, and guided meditation sessions. Connect with your higher self.",
    url: "https://stellawei.org/services/spiritual",
    siteName: "Stellawei",
    locale: "en_US",
    type: "website",
  },
};

export default function SpiritualLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
