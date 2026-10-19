import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center | Stellawei",
  description: "Frequently asked questions about booking consultations, services, payment, and refunds at Stellawei.",
  alternates: {
    canonical: "https://stellawei.org/help",
  },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
