'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Briefcase,
  Coins,
  Home,
  Compass,
  HeartHandshake,
  Search,
  Dog,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Star,
} from "lucide-react";
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import type { TopicData, QuestionData } from "@/lib/knowledge-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart,
  briefcase: Briefcase,
  coins: Coins,
  home: Home,
  compass: Compass,
  "heart-handshake": HeartHandshake,
  search: Search,
  dog: Dog,
  "trending-up": TrendingUp,
};

interface KnowledgeHubContentProps {
  topic: TopicData;
  questions: QuestionData[];
}

export default function KnowledgeHubContent({ topic, questions }: KnowledgeHubContentProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const featuredQuestions = questions.filter((q) => q.featured);
  const otherQuestions = questions.filter((q) => !q.featured);

  const Icon = iconMap[topic.icon] || Compass;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-sw-accent flex items-center justify-center">
                <Star className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-serif font-bold text-white">{t('brand')}</span>
              <span className="text-sm text-white/70 hidden sm:inline">| {isZh ? '在线咨询平台' : 'Online Divination Platform'}</span>
            </Link>
            <div className="flex items-center space-x-3 text-sm">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                {isZh ? '首页' : 'Home'}
              </Link>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <Link href="/knowledge" className="text-gray-400 hover:text-white transition-colors">
                {isZh ? '知识库' : 'Knowledge'}
              </Link>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className="text-stellawei-purple">
                {isZh ? topic.nameCn : topic.name}
              </span>
              <div className="ml-2">
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero — V1.1: Shortened */}
      <section className="pt-24 pb-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-stellawei-purple/10 mb-4">
            <Icon className="w-6 h-6 text-stellawei-purple" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-3">
            {isZh ? topic.nameCn : topic.name}
          </h1>
          <p className="text-base text-white/60 max-w-2xl mx-auto">
            {isZh ? topic.descriptionCn : topic.description}
          </p>
        </div>
      </section>

      {/* Topic Introduction — V1.1: New */}
      <section className="pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/5">
            <p className="text-white/80 text-base leading-relaxed">
              {isZh ? topic.introCn : topic.intro}
            </p>
          </div>
        </div>
      </section>

      {/* Popular Questions — V1.1: Renamed */}
      <section className="py-10 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-serif font-bold text-white mb-6">
            {isZh ? '热门问题' : 'Most Popular Questions'}
          </h2>

          <div className="space-y-3">
            {featuredQuestions.map((q) => (
              <div
                key={q.slug}
                className="group flex items-center justify-between bg-black/60 backdrop-blur-sm border border-white/10 
                         rounded-xl px-5 py-4 hover:border-stellawei-purple/60 hover:bg-black/70
                         transition-all duration-200 cursor-pointer"
              >
                <span className="text-white group-hover:text-stellawei-purple transition-colors">
                  {isZh ? q.questionCn : q.question}
                </span>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-stellawei-purple 
                                       transform group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Questions — V1.1: Renamed */}
      {otherQuestions.length > 0 && (
        <section className="py-10 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-lg font-serif font-bold text-white mb-5">
              {isZh ? '更多相关问题' : 'More Related Questions'}
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {otherQuestions.map((q) => (
                <div
                  key={q.slug}
                  className="group flex items-center justify-between bg-black/40 border border-white/5 
                           rounded-xl px-4 py-3 hover:border-stellawei-purple/40 hover:bg-black/50
                           transition-all duration-200 cursor-pointer"
                >
                  <span className="text-white/70 text-sm group-hover:text-stellawei-purple transition-colors">
                    {isZh ? q.questionCn : q.question}
                  </span>
                  <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-stellawei-purple 
                                         transform group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Articles — V1.1: Placeholder for future */}
      <section className="py-10 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-serif font-bold text-white mb-5">
            {isZh ? '相关文章' : 'Related Articles'}
          </h2>
          <div className="bg-black/40 border border-white/5 rounded-xl p-8 text-center">
            <p className="text-white/40 text-sm">
              {isZh ? '深度解析文章即将上线' : 'In-depth articles coming soon'}
            </p>
          </div>
        </div>
      </section>

      {/* CTA — V1.1: Added lead text */}
      <section className="py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-4">
            {isZh ? '没有找到适合你的答案？' : "Didn't find your answer?"}
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            {isZh
              ? '我们的咨询师可以根据你的实际情况，提供更个性化的分析与建议。'
              : 'Get personalized guidance from our experienced consultants based on your unique situation.'}
          </p>
          <Link href="/masters">
            <Button size="lg" className="px-8 bg-stellawei-purple hover:bg-stellawei-purple/90">
              {isZh ? '预约咨询' : 'Book a Consultation'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
