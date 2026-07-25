import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTopicBySlug } from "@/lib/knowledge-data";
import { getArticleBySlug } from "@/lib/knowledge-articles";
import {
  Breadcrumb,
  Hero,
  QuickAnswer,
  ReadingSummary,
  WhyPeopleAsk,
  EasternWisdom,
  WhatReallyMatters,
  BenefitChecklist,
  CaseStudy,
  FAQ,
  KeyTakeaways,
  RelatedQuestions,
  CTA,
  EEAT,
} from "@/components/knowledge";
import { NavHeader } from "@/components/knowledge/NavHeader";

interface Props {
  params: { slug: string; questionSlug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const article = getArticleBySlug(params.questionSlug);

  if (!article) {
    return {
      title: "Article Not Found | Stellawei",
      robots: "noindex",
    };
  }

  const title = article.metaTitle;
  const description = article.metaDescription;

  return {
    title,
    description,
    alternates: {
      canonical: article.canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: article.canonicalUrl,
      siteName: "Stellawei",
      locale: "en_US",
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.modifiedAt,
      authors: [article.author],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: "index, follow",
  };
}

export function generateStaticParams() {
  return [
    { slug: "relationship", questionSlug: "when-will-i-meet-my-true-love" },
  ];
}

export default function KnowledgeArticlePage({ params }: Props) {
  const { slug, questionSlug } = params;

  const topic = getTopicBySlug(slug);
  const article = getArticleBySlug(questionSlug);

  if (!topic || !article) {
    notFound();
  }

  // Breadcrumb items
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Knowledge Center", href: "/knowledge" },
    { label: topic.name, href: `/knowledge/${slug}` },
    { label: article.question },
  ];

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.question,
    description: article.metaDescription,
    url: article.canonicalUrl,
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt,
    author: {
      "@type": "Organization",
      name: article.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Stellawei",
      logo: {
        "@type": "ImageObject",
        url: "https://stellawei.org/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": article.canonicalUrl,
    },
    // FAQ Schema
    ...(article.faq.length > 0 && {
      mainEntity: article.faq.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    }),
  };

  // Breadcrumb Schema
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems
      .filter((item) => item.href || item.label)
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        ...(item.href && { item: `https://stellawei.org${item.href}` }),
      })),
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Navigation */}
      <NavHeader topic={topic} />

      <main className="pt-16">
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {/* Hero */}
        <Hero
          topic={topic}
          question={article.question}
          questionCn={article.questionCn}
          intro={article.heroIntro}
          introCn={article.heroIntroCn}
        />

        {/* Quick Answer */}
        <QuickAnswer
          content={article.quickAnswer}
          contentCn={article.quickAnswerCn}
        />

        {/* V2.0: Reading Summary */}
        <ReadingSummary content={article.readingSummary} />

        <Divider />

        {/* Why People Ask */}
        <WhyPeopleAsk
          content={article.whyPeopleAsk}
          contentCn={article.whyPeopleAskCn}
        />

        <Divider />

        {/* Eastern Wisdom */}
        <EasternWisdom
          content={article.easternWisdom}
          contentCn={article.easternWisdomCn}
        />

        <Divider />

        {/* What Really Matters */}
        <WhatReallyMatters
          content={article.whatReallyMatters}
          contentCn={article.whatReallyMattersCn}
        />

        <Divider />

        {/* Benefit Checklist */}
        <BenefitChecklist
          content={article.benefitChecklist}
          contentCn={article.benefitChecklistCn}
        />

        <Divider />

        {/* V2.0: Case Studies */}
        {article.caseStudies.length > 0 && (
          <>
            <CaseStudy items={article.caseStudies} />
            <Divider />
          </>
        )}

        {/* FAQ */}
        <FAQ items={article.faq} />

        <Divider />

        {/* V2.0: Key Takeaways */}
        <KeyTakeaways content={article.keyTakeaways} />

        <Divider />

        {/* Related Questions */}
        <RelatedQuestions
          items={article.relatedQuestions}
          topicSlug={slug}
        />

        {/* CTA */}
        <CTA content={article.cta} />

        {/* V2.0: EEAT */}
        <EEAT
          info={article.eeat}
          publishedAt={article.publishedAt}
          modifiedAt={article.modifiedAt}
        />
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/30 text-sm">
            © 2026 Stellawei. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Divider() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="border-t border-white/5" />
    </div>
  );
}
