'use client';

import { useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { track } from "@/lib/analytics";

interface KnowledgeCTAProps {
  articleSlug: string;
  topicSlug: string;
}

export default function KnowledgeCTA({ articleSlug, topicSlug }: KnowledgeCTAProps) {
  const { user, isLoading } = useAuth();
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const loginUrl = `/auth/login?redirect=${encodeURIComponent(currentUrl)}`;

  // Track CTA view once
  useEffect(() => {
    if (isLoading) return;
    track.knowledgeCTAView({
      article_slug: articleSlug,
      topic: topicSlug,
      page_url: currentUrl,
    });
  }, [isLoading, articleSlug, topicSlug, currentUrl]);

  const handleRegisterClick = () => {
    track.knowledgeRegisterClick({
      article_slug: articleSlug,
      topic: topicSlug,
      page_url: currentUrl,
    });
  };

  // Loading state: don't render to avoid flash
  if (isLoading) {
    return (
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-2xl p-8 sm:p-10 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-4" />
            <div className="h-10 bg-white/10 rounded w-48 mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  // Logged in user
  if (user) {
    return (
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-2xl p-8 sm:p-10">
            <p className="text-white/80 text-lg leading-relaxed mb-6 max-w-2xl mx-auto">
              {isZh
                ? "还在寻找更个性化的答案？"
                : "Still looking for a more personalized answer?"}
            </p>
            <Link
              href="/booking"
              className="inline-flex items-center px-8 py-4 bg-stellawei-purple text-white font-medium rounded-xl hover:bg-stellawei-purple/90 transition-colors"
            >
              {isZh ? "预约咨询" : "Book a Consultation"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Not logged in user
  return (
    <section className="py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-2xl p-8 sm:p-10">
          <p className="text-white/80 text-lg leading-relaxed mb-6 max-w-2xl mx-auto">
            {isZh
              ? "想进一步了解自己的情况？创建免费账户，开始使用 StellaWei。"
              : "Want to explore your situation further? Create a free account to get started with StellaWei."}
          </p>
          <Link
            href={loginUrl}
            onClick={handleRegisterClick}
            className="inline-flex items-center px-8 py-4 bg-stellawei-purple text-white font-medium rounded-xl hover:bg-stellawei-purple/90 transition-colors"
          >
            {isZh ? "创建免费账户" : "Create Your Free Account"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
}
