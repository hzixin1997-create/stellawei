'use client';

import { useTranslation } from "react-i18next";
import { Shield, Calendar, RefreshCw } from "lucide-react";
import type { EEATInfo } from "@/lib/knowledge-articles";

interface EEATProps {
  info: EEATInfo;
  publishedAt: string;
  modifiedAt: string;
}

export default function EEAT({ info, publishedAt, modifiedAt }: EEATProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  return (
    <section className="py-6 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
          {/* Reviewed By */}
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>{isZh ? info.reviewedByCn : info.reviewedBy}</span>
          </div>

          {/* Published */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {isZh ? "发布于" : "Published"} {publishedAt}
            </span>
          </div>

          {/* Modified */}
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              {isZh ? "更新于" : "Updated"} {modifiedAt}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
