'use client';

import { useTranslation } from "react-i18next";
import { Zap } from "lucide-react";
import type { QuickAnswerSection } from "@/lib/knowledge-articles";

interface QuickAnswerProps {
  content: QuickAnswerSection;
  contentCn: QuickAnswerSection;
}

export default function QuickAnswer({ content, contentCn }: QuickAnswerProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const data = isZh ? contentCn : content;

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-2xl p-6 sm:p-8">
          {/* Section Header */}
          <div className="flex items-center gap-2 mb-5">
            <Zap className="w-5 h-5 text-stellawei-purple" />
            <h2 className="text-lg font-semibold text-white">
              {isZh ? "快速回答" : "Quick Answer"}
            </h2>
          </div>

          {/* Paragraphs */}
          <div className="space-y-3 mb-5">
            {data.paragraphs.map((p, i) => (
              <p key={i} className="text-white/80 leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {/* Bullets */}
          {data.bullets && data.bullets.length > 0 && (
            <ul className="space-y-2">
              {data.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-stellawei-purple mt-2 flex-shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
