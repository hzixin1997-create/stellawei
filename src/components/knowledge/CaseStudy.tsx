'use client';

import { useTranslation } from "react-i18next";
import { Quote, User } from "lucide-react";
import type { CaseStudy } from "@/lib/knowledge-articles";

interface CaseStudyProps {
  items: CaseStudy[];
}

export default function CaseStudySection({ items }: CaseStudyProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-5">
          <Quote className="w-5 h-5 text-stellawei-purple" />
          <h2 className="text-xl font-serif font-bold text-white">
            {isZh ? "真实案例" : "Real Case Study"}
          </h2>
        </div>

        {/* Case Studies */}
        <div className="space-y-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-black/30 border border-white/5 rounded-xl p-5 sm:p-6"
            >
              {/* Title */}
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-stellawei-purple" />
                {isZh ? item.titleCn : item.title}
              </h3>

              {/* Content */}
              <p className="text-white/60 text-sm leading-relaxed italic">
                {isZh ? item.contentCn : item.content}
              </p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <p className="text-white/30 text-xs mt-4 text-center">
          {isZh
            ? "案例已匿名化处理。结果因人而异，咨询旨在帮助理解问题，而非保证结果。"
            : "Cases are anonymized. Results vary by individual. Consultations aim to help you understand your situation, not guarantee outcomes."}
        </p>
      </div>
    </section>
  );
}
