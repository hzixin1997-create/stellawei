import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Stellawei",
  description: "Stellawei's 7-day money-back guarantee and refund terms.",
  alternates: {
    canonical: "https://stellawei.org/refund-policy",
  },
};

export default function RefundPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
