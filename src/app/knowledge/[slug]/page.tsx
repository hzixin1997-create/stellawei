import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Briefcase,
  Coins,
  Home,
  Compass,
  HeartHandshake,
  Search,
  Dog,
  TrendingUp,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { getTopicBySlug, getQuestionsByTopic } from "@/lib/knowledge-data";
import type { Metadata } from "next";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  briefcase: Briefcase,
  coins: Coins,
  home: Home,
  compass: Compass,
  "heart-handshake": HeartHandshake,
  search: Search,
  dog: Dog,
  "trending-up": TrendingUp,
};

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
  const featuredQuestions = questions.filter((q) => q.featured);
  const otherQuestions = questions.filter((q) => !q.featured);

  const Icon = iconMap[topic.icon] || Compass;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a1a]/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-stellawei-purple to-stellawei-gold" />
              <span className="text-lg font-serif font-bold text-white">
                Stellawei
              </span>
            </Link>
            <div className="flex items-center space-x-3 text-sm">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <Link href="/knowledge" className="text-gray-400 hover:text-white transition-colors">
                Knowledge
              </Link>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className="text-stellawei-purple">{topic.name}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stellawei-purple/10 mb-6">
            <Icon className="w-8 h-8 text-stellawei-purple" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
            {topic.name}
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {topic.description}
          </p>
        </div>
      </section>

      {/* Featured Questions */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-serif font-bold text-white mb-8">
            Most Asked Questions
          </h2>

          <div className="space-y-3">
            {featuredQuestions.map((q) => (
              <div
                key={q.slug}
                className="group flex items-center justify-between bg-[#12122a] border border-gray-800 
                         rounded-xl px-5 py-4 hover:border-stellawei-purple/60 hover:bg-[#1a1a3e]
                         transition-all duration-200 cursor-pointer"
              >
                <span className="text-white group-hover:text-stellawei-purple transition-colors">
                  {q.question}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-stellawei-purple 
                                       transform group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other Questions */}
      {otherQuestions.length > 0 && (
        <section className="py-12 border-t border-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-serif font-bold text-white mb-6">
              More Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {otherQuestions.map((q) => (
                <div
                  key={q.slug}
                  className="group flex items-center justify-between bg-[#12122a]/50 border border-gray-800/50 
                           rounded-xl px-4 py-3 hover:border-stellawei-purple/40 hover:bg-[#1a1a3e]/50
                           transition-all duration-200 cursor-pointer"
                >
                  <span className="text-gray-300 text-sm group-hover:text-stellawei-purple transition-colors">
                    {q.question}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-stellawei-purple 
                                         transform group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 border-t border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-4">
            Still need personal guidance?
          </h2>
          <p className="text-gray-400 mb-8">
            Our verified masters are ready to help you find clarity.
          </p>
          <Link href="/masters">
            <Button size="lg" className="px-8 bg-stellawei-purple hover:bg-stellawei-purple/90">
              Book a Consultation
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
