'use client';

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { NavHeader } from "@/components/knowledge/NavHeader";
import { getTopicBySlug } from "@/lib/knowledge-data";
import { getArticleBySlug } from "@/lib/knowledge-articles";

interface Props {
  params: { slug: string; questionSlug: string };
}

export default function KnowledgeArticlePage({ params }: Props) {
  const { slug, questionSlug } = params;
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const topic = getTopicBySlug(slug) ?? getTopicBySlug("relationship")!;
  const article = getArticleBySlug(questionSlug);

  // Fallback: if article not found, show a minimal page (prevents crash)
  if (!article) {
    return (
      <div className="min-h-screen bg-[#0a0a1a]">
        <NavHeader topic={topic} />
        <main className="pt-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-serif font-bold text-white mb-4">
            {isZh ? "文章即将上线" : "Article Coming Soon"}
          </h1>
          <p className="text-white/60 mb-8">
            {isZh
              ? "这篇知识文章正在撰写中，敬请期待。"
              : "This knowledge article is being written. Stay tuned."}
          </p>
          <Link
            href={`/knowledge/${topic?.slug}`}
            className="inline-flex items-center px-6 py-3 bg-stellawei-purple text-white font-medium rounded-xl hover:bg-stellawei-purple/90 transition-colors"
          >
            {isZh ? "返回知识中心" : "Back to Knowledge Center"}
          </Link>
        </main>
      </div>
    );
  }

  // Breadcrumb items
  const breadcrumbItems = [
    { label: isZh ? "首页" : "Home", href: "/" },
    { label: isZh ? "知识中心" : "Knowledge Center", href: "/knowledge" },
    { label: isZh ? topic?.nameCn : topic?.name, href: `/knowledge/${topic?.slug}` },
    { label: isZh ? article.questionCn : article.question },
  ];

  // Dynamic JSON-LD
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: isZh ? article.metaTitleCn : article.metaTitle,
    description: isZh ? article.metaDescriptionCn : article.metaDescription,
    url: article.canonicalUrl,
    datePublished: article.publishedAt,
    dateModified: article.modifiedAt,
    author: { "@type": "Organization", name: article.author },
    publisher: {
      "@type": "Organization",
      name: "Stellawei",
      logo: { "@type": "ImageObject", url: "https://stellawei.org/logo.png" },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://stellawei.org/" },
      { "@type": "ListItem", position: 2, name: "Knowledge Center", item: "https://stellawei.org/knowledge" },
      { "@type": "ListItem", position: 3, name: topic?.name, item: `https://stellawei.org/knowledge/${topic?.slug}` },
      { "@type": "ListItem", position: 4, name: article.question },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faq.map((f) => ({
      "@type": "Question",
      name: isZh ? f.questionCn : f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: isZh ? f.answerCn : f.answer,
      },
    })),
  };

  // Content helpers
  const qa = isZh ? article.quickAnswerCn : article.quickAnswer;
  const wpa = isZh ? article.whyPeopleAskCn : article.whyPeopleAsk;
  const ewTools = isZh ? article.easternWisdomCn.tools : article.easternWisdom.tools;
  const wtm = isZh ? article.whatReallyMattersCn : article.whatReallyMatters;
  const bc = isZh ? article.benefitChecklistCn : article.benefitChecklist;
  const cs = article.caseStudies[0];
  const kt = isZh ? article.keyTakeaways : article.keyTakeaways; // keyTakeaways doesn't have Cn suffix in type?
  const rq = article.relatedQuestions;
  const cta = article.cta;
  const eeat = article.eeat;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <NavHeader topic={topic} />

      <main className="pt-16">
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-white/40">
            {breadcrumbItems.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                {item.href ? (
                  <Link href={item.href} className="hover:text-white/60 transition-colors">{item.label}</Link>
                ) : (
                  <span className="text-white/60">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Hero */}
        <section className="py-8 sm:py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="inline-block px-3 py-1 rounded-full bg-stellawei-purple/10 text-stellawei-purple text-sm mb-4">
              {isZh ? topic?.nameCn : topic?.name}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">
              {isZh ? article.questionCn : article.question}
            </h1>
            <p className="text-lg text-white/60 max-w-2xl">
              {isZh ? article.heroIntroCn : article.heroIntro}
            </p>
          </div>
        </section>

        {/* Quick Answer */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">
            {isZh ? "快速回答" : "Quick Answer"}
          </h2>
          <div className="space-y-4">
            {qa.paragraphs.map((p, i) => (
              <p key={i} className="text-white/70 leading-relaxed">{p}</p>
            ))}
            {qa.bullets && (
              <ul className="space-y-2 text-white/60 mt-4">
                {qa.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        {/* Why People Ask */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">
            {isZh ? "为什么人们会问这个问题？" : "Why Do People Ask This Question?"}
          </h2>
          <p className="text-white/60 mb-4">{wpa.intro}</p>
          <div className="space-y-4">
            {wpa.questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-stellawei-purple font-bold mt-0.5">{i + 1}.</span>
                <p className="text-white/70">{q}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Eastern Wisdom Tools */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">
            {isZh ? "东西方命理如何帮助" : "How Eastern and Western Wisdom Can Help"}
          </h2>
          <div className="space-y-8">
            {ewTools.map((tool, idx) => (
              <div key={idx} className="bg-black/20 border border-white/5 rounded-xl p-5">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {isZh ? tool.searchHeadingCn : tool.searchHeading}
                </h3>
                <p className="text-white/60 leading-relaxed mb-4">
                  {isZh ? tool.descriptionCn : tool.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(isZh ? tool.suitableForCn : tool.suitableFor).map((tag, tidx) => (
                    <span key={tidx} className="px-3 py-1 bg-stellawei-purple/10 text-stellawei-purple text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* What Really Matters */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">
            {isZh ? "核心要点" : "What Really Matters"}
          </h2>
          <p className="text-white/60 mb-4">{wtm.intro}</p>
          <div className="space-y-4">
            {wtm.points.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-stellawei-purple font-bold mt-0.5">{i + 1}.</span>
                <p className="text-white/70 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Benefit Checklist */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">
            {isZh ? "这可能对你有帮助，如果…" : "This May Help If…"}
          </h2>
          <p className="text-white/60 mb-4">{bc.intro}</p>
          <div className="space-y-3">
            {bc.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-stellawei-purple mt-1">✓</span>
                <p className="text-white/70">{item}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Case Study */}
        {cs && (
          <Section>
            <h2 className="text-2xl font-serif font-bold text-white mb-6">
              {isZh ? "真实案例" : "Real Case Study"}
            </h2>
            <div className="bg-black/30 border border-white/5 rounded-xl p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                {isZh ? cs.titleCn : cs.title}
              </h3>
              <p className="text-white/60 leading-relaxed text-sm">
                {isZh ? cs.contentCn : cs.content}
              </p>
            </div>
            <p className="text-white/30 text-xs mt-4 text-center">
              {isZh
                ? "案例已匿名化处理。结果因人而异，咨询旨在帮助理解问题，而非保证结果。"
                : "Case is anonymized. Results vary by individual. Consultations aim to help you understand your situation, not guarantee outcomes."}
            </p>
          </Section>
        )}

        {/* FAQ */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">
            {isZh ? "常见问题" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-6">
            {article.faq.map((f, i) => (
              <div key={i} className="bg-black/20 border border-white/5 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-2">
                  {isZh ? f.questionCn : f.question}
                </h3>
                <p className="text-white/60 leading-relaxed text-sm">
                  {isZh ? f.answerCn : f.answer}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Key Takeaways */}
        <Section>
          <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-5">
              {isZh ? "本文核心观点" : "Key Takeaways"}
            </h2>
            <div className="space-y-4">
              {kt.itemsCn.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="text-stellawei-purple font-bold text-xl mt-0.5">{i + 1}</span>
                  <p className="text-white/80 leading-relaxed">{isZh ? item : kt.items[i]}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Related Questions */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">
            {isZh ? "相关问题" : "Related Questions"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rq.map((q) => (
              <Link
                key={q.slug}
                href={`/knowledge/relationship/${q.slug}`}
                className="block p-4 bg-black/20 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
              >
                <p className="text-white/70 text-sm">{isZh ? q.questionCn : q.question}</p>
              </Link>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-white/60 mb-6 max-w-2xl mx-auto">
              {isZh ? cta.textCn : cta.text}
            </p>
            <Link
              href={cta.link}
              className="inline-flex items-center px-8 py-4 bg-stellawei-purple text-white font-medium rounded-xl hover:bg-stellawei-purple/90 transition-colors"
            >
              {isZh ? cta.buttonTextCn : cta.buttonText}
            </Link>
          </div>
        </section>

        {/* EEAT */}
        <section className="py-6 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
              <span>{isZh ? eeat.reviewedByCn : eeat.reviewedBy}</span>
              <span>{isZh ? "发布于" : "Published"} {article.publishedAt}</span>
              <span>{isZh ? "更新于" : "Updated"} {article.modifiedAt}</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/30 text-sm">© 2026 Stellawei. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Layout helpers
function Section({ children }: { children: React.ReactNode }) {
  return (
    <>
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </section>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-white/5" />
      </div>
    </>
  );
}
