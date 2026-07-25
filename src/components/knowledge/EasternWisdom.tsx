'use client';

import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import type { EasternWisdomSection } from "@/lib/knowledge-articles";

interface EasternWisdomProps {
  content: EasternWisdomSection;
  contentCn: EasternWisdomSection;
}

export default function EasternWisdom({ content, contentCn }: EasternWisdomProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const data = isZh ? contentCn : content;

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-stellawei-purple" />
          <h2 className="text-xl font-serif font-bold text-white">
            {isZh ? "不同咨询方式如何帮助分析？" : "How Different Methods Can Help"}
          </h2>
        </div>

        {/* Tools */}
        <div className="space-y-4">
          {data.tools.map((tool, i) => (
            <div
              key={i}
              className="bg-black/30 border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors"
            >
              {/* V2.0: 搜索式标题 */}
              <h3 className="text-lg font-semibold text-white mb-2">
                {isZh ? tool.searchHeadingCn : tool.searchHeading}
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-3">
                {isZh ? tool.descriptionCn : tool.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {(isZh ? tool.suitableForCn : tool.suitableFor).map((item, j) => (
                  <span
                    key={j}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-stellawei-purple/10 text-stellawei-purple text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
