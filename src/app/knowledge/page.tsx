'use client';

import Link from "next/link";
import { useTranslation } from "react-i18next";
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

interface Topic {
  slug: string;
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
  icon: string;
}

const topics: Topic[] = [
  {
    slug: "relationship",
    name: "Relationship",
    nameCn: "恋爱",
    description: "Love, compatibility, and emotional guidance",
    descriptionCn: "爱情、缘分与情感指引",
    icon: "heart",
  },
  {
    slug: "career",
    name: "Career",
    nameCn: "事业",
    description: "Career decisions, promotions, and professional growth",
    descriptionCn: "职业选择、晋升与事业发展",
    icon: "briefcase",
  },
  {
    slug: "wealth",
    name: "Wealth",
    nameCn: "财运",
    description: "Financial fortune, investment timing, and wealth growth",
    descriptionCn: "财富运势、投资时机与财运增长",
    icon: "coins",
  },
  {
    slug: "home-feng-shui",
    name: "Home Feng Shui",
    nameCn: "家居风水",
    description: "Home energy, space arrangement, and environmental harmony",
    descriptionCn: "家居能量、空间布局与环境和谐",
    icon: "home",
  },
  {
    slug: "life-direction",
    name: "Life Direction",
    nameCn: "人生方向",
    description: "Life path, destiny, and personal purpose",
    descriptionCn: "人生道路、命运与个人使命",
    icon: "compass",
  },
  {
    slug: "marriage",
    name: "Marriage",
    nameCn: "婚姻",
    description: "Marriage timing, compatibility, and relationship stability",
    descriptionCn: "婚姻时机、配对与关系稳定",
    icon: "heart-handshake",
  },
  {
    slug: "lost-items",
    name: "Lost Items",
    nameCn: "寻物",
    description: "Finding lost objects, recovery timing, and location clues",
    descriptionCn: "寻找失物、找回时机与位置线索",
    icon: "search",
  },
  {
    slug: "pet-health",
    name: "Pet Health",
    nameCn: "宠物健康",
    description: "Pet wellness, health predictions, and care guidance",
    descriptionCn: "宠物健康、健康预测与护理指引",
    icon: "dog",
  },
  {
    slug: "investment",
    name: "Investment",
    nameCn: "投资",
    description: "Investment timing, market trends, and financial decisions",
    descriptionCn: "投资时机、市场趋势与财务决策",
    icon: "trending-up",
  },
];

export default function KnowledgeIndexPage() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === "zh";

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
            </Link>
            <div className="flex items-center space-x-3 text-sm">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                {isZh ? '首页' : 'Home'}
              </Link>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className="text-stellawei-purple">
                {isZh ? '知识库' : 'Knowledge'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
            {isZh ? '知识中心' : 'Knowledge Center'}
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            {isZh
              ? '探索人生重大决策，寻找属于你的答案。'
              : 'Explore life\'s major decisions and find your answers.'}
          </p>
        </div>
      </section>

      {/* Topic Cards */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {topics.map((topic) => {
              const Icon = iconMap[topic.icon] || Compass;
              return (
                <Link
                  key={topic.slug}
                  href={`/knowledge/${topic.slug}`}
                  className="group relative bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl p-5 
                           hover:border-stellawei-purple/60 hover:bg-black/80
                           transition-all duration-200 cursor-pointer"
                >
                  <div className="flex flex-col h-full">
                    <div className="w-10 h-10 rounded-lg bg-stellawei-purple/10 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-stellawei-purple" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">
                      {isZh ? topic.nameCn : topic.name}
                    </h3>
                    <div className="mt-auto flex items-center text-white/60 group-hover:text-stellawei-purple transition-colors">
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/40 text-sm">
            © 2026 {t('brand')}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
