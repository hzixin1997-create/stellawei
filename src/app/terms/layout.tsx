import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Stellawei",
  description: "Terms and conditions for using Stellawei's fortune telling and spiritual guidance services.",
  alternates: {
    canonical: "https://stellawei.org/terms",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
