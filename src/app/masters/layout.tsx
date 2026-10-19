import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Masters | Stellawei",
  description: "Meet Stellawei's verified and certified masters specializing in Tarot, BaZi, Feng Shui, Qi Men Dun Jia, and spiritual guidance.",
  alternates: {
    canonical: "https://stellawei.org/masters",
  },
};

export default function MastersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
