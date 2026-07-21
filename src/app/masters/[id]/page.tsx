import { masters } from "@/lib/data"
import { notFound } from "next/navigation"
import { ClientMasterContent } from "./ClientMasterContent";
import type { Metadata } from "next";

interface Props {
  params: { id: string }
}

// Generate static params for all masters
export function generateStaticParams() {
  return masters.map((master) => ({
    id: master.id,
  }))
}

// Dynamic metadata for each master page
export function generateMetadata({ params }: Props): Metadata {
  const master = masters.find(m => m.id === params.id)
  
  if (!master) {
    return {
      title: "Master Not Found | Stellawei",
      robots: "noindex",
    }
  }

  const title = `${master.display_name} - ${master.specialties.map(s => {
    const map: Record<string, string> = {
      tarot: "Tarot Reading",
      astrology: "Astrology",
      bazi: "BaZi Analysis",
      fengshui: "Feng Shui",
      qimen: "Qi Men Dun Jia",
      liuyao: "Liu Yao Divination",
      spiritual: "Spiritual Guidance",
    }
    return map[s] || s
  }).join(" & ")} | Stellawei`

  const description = `${master.display_name} has ${master.experience_years}+ years of experience. ${master.bio.slice(0, 150)}... Book a consultation today.`

  const canonicalUrl = `https://stellawei.org/masters/${master.id}`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${master.display_name} | Stellawei`,
      description: master.bio.slice(0, 200),
      url: canonicalUrl,
      siteName: "Stellawei",
      locale: "en_US",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${master.display_name} | Stellawei`,
      description: master.bio.slice(0, 200),
    },
    robots: "index, follow",
  }
}

export default function MasterDetailPage({ params }: Props) {
  const master = masters.find(m => m.id === params.id)
  
  if (!master) {
    notFound()
  }

  return (
    <ClientMasterContent master={master} />
  )
}
