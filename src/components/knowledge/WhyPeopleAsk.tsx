'use client';

import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import type { WhyPeopleAskSection } from "@/lib/knowledge-articles";

interface WhyPeopleAskProps {
  content: WhyPeopleAskSection;
  contentCn: WhyPeopleAskSection;
}

export default function WhyPeopleAsk({ content, contentCn }: WhyPeopleAskProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const data = isZh ? contentCn : content;

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-5">
          <HelpCircle className="w-5 h-5 text-stellawei-purple" />
          <h2 className="text-xl font-serif font-bold text-white">
            {isZh ? "为什么大家都会问这个问题" : "Why People Ask This"}
          </h2>
        </div>

        {/* Intro */}
        <p className="text-white/70 leading-relaxed mb-5">
          {data.intro}
        </p>

        {/* Questions */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-5 space-y-3">
          {data.questions.map((q, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-stellawei-purple font-medium mt-0.5">•</span>
              <span className="text-white/80">{q}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
