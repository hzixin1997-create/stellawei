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

      {/* Hero */}
      <section className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stellawei-purple/10 mb-6">
            <Icon className="w-8 h-8 text-stellawei-purple" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
            {isZh ? topic.nameCn : topic.name}
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            {isZh ? topic.descriptionCn : topic.description}
          </p>
        </div>
      </section>

      {/* Featured Questions */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-serif font-bold text-white mb-8">
            {isZh ? '常见问题' : 'Most Asked Questions'}
          </h2>

          <div className="space-y-3">
            {featuredQuestions.map((q) => (
              <div
                key={q.slug}
                className="group flex items-center justify-between bg-[#12122a] border border-gray-800 
                         rounded-xl px-5 py-4 hover:border-stellawei-purple/60 hover:bg-[#1a1a3e]
                         transition-all duration-200 cursor-pointer"
              >
                <span className="text-white group-hover:text-stellawei-purple transition-colors">
                  {isZh ? q.questionCn : q.question}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-stellawei-purple 
                                       transform group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other Questions */}
      {otherQuestions.length > 0 && (
        <section className="py-12 border-t border-gray-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-serif font-bold text-white mb-6">
              {isZh ? '更多问题' : 'More Questions'}
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {otherQuestions.map((q) => (
                <div
                  key={q.slug}
                  className="group flex items-center justify-between bg-[#12122a]/50 border border-gray-800/50 
                           rounded-xl px-4 py-3 hover:border-stellawei-purple/40 hover:bg-[#1a1a3e]/50
                           transition-all duration-200 cursor-pointer"
                >
                  <span className="text-gray-300 text-sm group-hover:text-stellawei-purple transition-colors">
                    {isZh ? q.questionCn : q.question}
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-600 group-hover:text-stellawei-purple 
                                         transform group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 border-t border-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-4">
            {isZh ? '还需要个人指导？' : 'Still need personal guidance?'}
          </h2>
          <p className="text-gray-400 mb-8">
            {isZh
              ? '我们经过验证的师傅随时准备帮助您找到清晰的答案。'
              : 'Our verified masters are ready to help you find clarity.'}
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
