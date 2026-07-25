'use client';

import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";
import type { KeyTakeawaysSection } from "@/lib/knowledge-articles";

interface KeyTakeawaysProps {
  content: KeyTakeawaysSection;
}

export default function KeyTakeaways({ content }: KeyTakeawaysProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const items = isZh ? content.itemsCn : content.items;

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-2xl p-6 sm:p-8">
          {/* Section Header */}
          <div className="flex items-center gap-2 mb-5">
            <Target className="w-5 h-5 text-stellawei-purple" />
            <h2 className="text-xl font-serif font-bold text-white">
              {isZh ? "本文核心观点" : "Key Takeaways"}
            </h2>
          </div>

          <p className="text-white/50 text-sm mb-5">
            {isZh ? "如果只记住三件事：" : "If you only remember three things:"}
          </p>

          {/* Takeaways */}
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-stellawei-purple font-bold text-xl mt-0.5">
                  {i + 1}
                </span>
                <p className="text-white/80 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
