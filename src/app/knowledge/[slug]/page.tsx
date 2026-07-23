import { notFound } from "next/navigation";
import { getTopicBySlug, getQuestionsByTopic } from "@/lib/knowledge-data";
import KnowledgeHubContent from "@/components/KnowledgeHubContent";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const topic = getTopicBySlug(params.slug);

  if (!topic) {
    return {
      title: "Topic Not Found | Stellawei",
      robots: "noindex",
    };
  }

  const title = `${topic.name} | Stellawei Knowledge Center`;
  const description = `${topic.description}. Explore questions, guides, and answers from Eastern wisdom.`;
  const canonicalUrl = `https://stellawei.org/knowledge/${topic.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${topic.name} | Stellawei`,
      description: topic.description,
      url: canonicalUrl,
      siteName: "Stellawei",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${topic.name} | Stellawei`,
      description: topic.description,
    },
    robots: "index, follow",
  };
}

export function generateStaticParams() {
  const slugs = [
    "relationship",
    "career",
    "wealth",
    "home-feng-shui",
    "life-direction",
    "marriage",
    "lost-items",
    "pet-health",
    "investment",
  ];
  return slugs.map((slug) => ({ slug }));
}

export default function KnowledgeHubPage({ params }: Props) {
  const topic = getTopicBySlug(params.slug);

  if (!topic) {
    notFound();
  }

  const questions = getQuestionsByTopic(params.slug);

  return <KnowledgeHubContent topic={topic} questions={questions} />;
}
