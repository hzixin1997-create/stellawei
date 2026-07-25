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
          <p className="text-white/80 text-lg leading-relaxed mb-6 max-w-2xl mx-auto">
            {isZh ? content.textCn : content.text}
          </p>
          <Link href={content.link}>
            <Button
              size="lg"
              className="px-8 bg-stellawei-purple hover:bg-stellawei-purple/90 text-white"
            >
              {isZh ? content.buttonTextCn : content.buttonText}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
