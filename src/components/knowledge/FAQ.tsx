'use client';

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircleQuestion, ChevronDown } from "lucide-react";
import type { FAQItem } from "@/lib/knowledge-articles";

interface FAQProps {
  items: FAQItem[];
}

export default function FAQ({ items }: FAQProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-5">
          <MessageCircleQuestion className="w-5 h-5 text-stellawei-purple" />
          <h2 className="text-xl font-serif font-bold text-white">
            {isZh ? "常见问题" : "FAQ"}
          </h2>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {items.map((item, i) => {
            const isOpen = openIndex === i;
            const question = isZh ? item.questionCn : item.question;
            const answer = isZh ? item.answerCn : item.answer;

            return (
              <div
                key={i}
                className="bg-black/30 border border-white/5 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-white font-medium pr-4">{question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-white/40 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ${
                    isOpen ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <div className="px-5 pb-5 text-white/60 leading-relaxed">
                    {answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
