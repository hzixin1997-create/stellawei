'use client';

import { useTranslation } from "react-i18next";
import { CheckSquare } from "lucide-react";
import type { BenefitChecklistSection } from "@/lib/knowledge-articles";

interface BenefitChecklistProps {
  content: BenefitChecklistSection;
  contentCn: BenefitChecklistSection;
}

export default function BenefitChecklist({ content, contentCn }: BenefitChecklistProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const data = isZh ? contentCn : content;

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-5">
          <CheckSquare className="w-5 h-5 text-stellawei-purple" />
          <h2 className="text-xl font-serif font-bold text-white">
            {isZh ? "适合哪些人咨询" : "Who Might Benefit From A Consultation"}
          </h2>
        </div>

        {/* Intro */}
        <p className="text-white/70 leading-relaxed mb-5">
          {data.intro}
        </p>

        {/* Checklist */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-3">
          {data.items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded border border-white/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-sm bg-stellawei-purple/60" />
              </div>
              <span className="text-white/80">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
