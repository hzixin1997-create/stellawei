'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";

interface RelatedQuestionsProps {
  items: { slug: string; question: string; questionCn: string }[];
  topicSlug: string;
}

export default function RelatedQuestions({ items, topicSlug }: RelatedQuestionsProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  return (
    <>
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-serif font-bold text-white mb-6">
            {isZh ? "相关问题" : "Related Questions"}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <Link
                key={i}
                href={`/knowledge/${topicSlug}/${item.slug}`}
                className="group flex items-center justify-between p-4 bg-black/20 border border-white/5 
                         rounded-xl hover:border-white/10 hover:bg-black/30
                         transition-all duration-200"
              >
                <span className="text-white/70 text-sm group-hover:text-white/90 transition-colors">
                  {isZh ? item.questionCn : item.question}
                </span>
                <span className="text-stellawei-purple text-sm ml-2 shrink-0 
                               transform group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-white/5" />
      </div>
    </>
  );
}
