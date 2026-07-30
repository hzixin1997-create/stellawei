'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CTASection } from "@/lib/knowledge-articles";

interface CTAProps {
  content: CTASection;
}

export default function CTA({ content }: CTAProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  return (
    <section className="py-12 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-2xl p-8 sm:p-10">
          <p className="text-white/80 text-lg leading-relaxed mb-2 max-w-2xl mx-auto">
            {isZh ? (content as any).textLine1Cn || (content as any).textCn : (content as any).textLine1 || (content as any).text}
          </p>
          {(content as any).textLine2 && (
            <p className="text-white/80 text-lg leading-relaxed mb-6 max-w-2xl mx-auto">
              {isZh ? (content as any).textLine2Cn : (content as any).textLine2}
            </p>
          )}
          {!((content as any).textLine2) && (
            <div className="mb-6" />
          )}
          <Link href={content.link}>
            <Button
              size="lg"
              className="px-8 bg-stellawei-purple hover:bg-stellawei-purple/90 text-white"
            >
              {isZh ? (content as any).buttonCn || (content as any).buttonTextCn : (content as any).button || (content as any).buttonText}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
