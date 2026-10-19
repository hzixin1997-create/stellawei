import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "Stellawei - Professional Fortune Telling & Spiritual Guidance",
  description: "Real human masters for Tarot, BaZi, Feng Shui, and spiritual guidance. Transparent fixed pricing, verified credentials, and a 7-day money-back guarantee.",
  alternates: {
    canonical: "https://stellawei.org",
  },
  openGraph: {
    title: "Stellawei - Professional Fortune Telling & Spiritual Guidance",
    description: "Real human masters for Tarot, BaZi, Feng Shui, and spiritual guidance. Transparent fixed pricing, verified credentials.",
    url: "https://stellawei.org",
    siteName: "Stellawei",
    locale: "en_US",
    type: "website",
  },
};

export default function Home() {
  return <HomeClient />;
}
