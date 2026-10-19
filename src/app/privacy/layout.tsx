import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Stellawei",
  description: "How Stellawei collects, uses, and protects your personal information.",
  alternates: {
    canonical: "https://stellawei.org/privacy",
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
