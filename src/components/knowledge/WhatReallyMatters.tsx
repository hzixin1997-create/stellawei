'use client';

import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";
import type { WhatReallyMattersSection } from "@/lib/knowledge-articles";

interface WhatReallyMattersProps {
  content: WhatReallyMattersSection;
  contentCn: WhatReallyMattersSection;
}

export default function WhatReallyMatters({ content, contentCn }: WhatReallyMattersProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const data = isZh ? contentCn : content;

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-5">
          <Lightbulb className="w-5 h-5 text-stellawei-purple" />
          <h2 className="text-xl font-serif font-bold text-white">
            {isZh ? "真正需要关注什么" : "What Really Matters"}
          </h2>
        </div>

        {/* Intro */}
        <p className="text-white/70 leading-relaxed mb-5">
          {data.intro}
        </p>

        {/* Points */}
        <div className="space-y-4">
          {data.points.map((point, i) => (
            <div
              key={i}
              className="flex items-start gap-4 bg-black/20 border-l-2 border-stellawei-purple/50 pl-4 py-3"
            >
              <span className="text-stellawei-purple font-bold text-lg mt-0.5">
                {i + 1}
              </span>
              <p className="text-white/80 leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
