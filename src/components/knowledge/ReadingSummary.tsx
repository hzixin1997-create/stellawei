'use client';

import { useTranslation } from "react-i18next";
import { BookOpen, Check } from "lucide-react";
import type { ReadingSummarySection } from "@/lib/knowledge-articles";

interface ReadingSummaryProps {
  content: ReadingSummarySection;
}

export default function ReadingSummary({ content }: ReadingSummaryProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const items = isZh ? content.itemsCn : content.items;

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-5">
          <BookOpen className="w-5 h-5 text-stellawei-purple" />
          <h2 className="text-xl font-serif font-bold text-white">
            {isZh ? "阅读这篇文章，你将了解" : "What You Will Learn From This Article"}
          </h2>
        </div>

        {/* Items */}
        <div className="bg-black/20 border border-white/5 rounded-xl p-5 space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-stellawei-purple/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                <Check className="w-3 h-3 text-stellawei-purple" />
              </div>
              <span className="text-white/80">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
