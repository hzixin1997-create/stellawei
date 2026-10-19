import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge Center | Stellawei",
  description: "Explore Eastern and Western divination knowledge on relationships, career, wealth, life direction, and more. Free guides from verified masters.",
  alternates: {
    canonical: "https://stellawei.org/knowledge",
  },
};

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
