'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight, MessagesSquare } from "lucide-react";
import type { RelatedQuestion } from "@/lib/knowledge-articles";

interface RelatedQuestionsProps {
  items: RelatedQuestion[];
  topicSlug: string;
}

export default function RelatedQuestions({ items, topicSlug }: RelatedQuestionsProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-5">
          <MessagesSquare className="w-5 h-5 text-stellawei-purple" />
          <h2 className="text-xl font-serif font-bold text-white">
            {isZh ? "相关问题" : "Related Questions"}
          </h2>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {items.map((item, i) => (
            <Link
              key={i}
              href={`/knowledge/${topicSlug}/${item.slug}`}
              className="group flex items-center justify-between bg-black/30 border border-white/5 
                       rounded-xl px-5 py-4 hover:border-stellawei-purple/40 hover:bg-black/40
                       transition-all duration-200"
            >
              <span className="text-white/80 group-hover:text-stellawei-purple transition-colors">
                {isZh ? item.questionCn : item.question}
              </span>
              <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-stellawei-purple 
                                     transform group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
