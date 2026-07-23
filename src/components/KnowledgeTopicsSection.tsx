"use client";

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
  questionCount?: number;
  guideCount?: number;
}

interface KnowledgeTopicsSectionProps {
  topics?: Topic[];
}

const defaultTopics: Topic[] = [
  {
    slug: "relationship",
    name: "Relationship",
    nameCn: "感情",
    description: "Love, compatibility, and emotional guidance",
    descriptionCn: "爱情、缘分与情感指引",
    icon: "heart",
    questionCount: 24,
    guideCount: 8,
  },
  {
    slug: "career",
    name: "Career",
    nameCn: "事业",
    description: "Career decisions, promotions, and professional growth",
    descriptionCn: "职业选择、晋升与事业发展",
    icon: "briefcase",
    questionCount: 18,
    guideCount: 6,
  },
  {
    slug: "wealth",
    name: "Wealth",
    nameCn: "财运",
    description: "Financial fortune, investment timing, and wealth growth",
    descriptionCn: "财富运势、投资时机与财运增长",
    icon: "coins",
    questionCount: 15,
    guideCount: 5,
  },
  {
    slug: "home-feng-shui",
    name: "Home Feng Shui",
    nameCn: "家居风水",
    description: "Home energy, space arrangement, and environmental harmony",
    descriptionCn: "家居能量、空间布局与环境和谐",
    icon: "home",
    questionCount: 12,
    guideCount: 4,
  },
  {
    slug: "life-direction",
    name: "Life Direction",
    nameCn: "人生方向",
    description: "Life path, destiny, and personal purpose",
    descriptionCn: "人生道路、命运与个人使命",
    icon: "compass",
    questionCount: 20,
    guideCount: 7,
  },
  {
    slug: "marriage",
    name: "Marriage",
    nameCn: "婚姻",
    description: "Marriage timing, compatibility, and relationship stability",
    descriptionCn: "婚姻时机、配对与关系稳定",
    icon: "heart-handshake",
    questionCount: 16,
    guideCount: 5,
  },
  {
    slug: "lost-items",
    name: "Lost Items",
    nameCn: "寻物",
    description: "Finding lost objects, recovery timing, and location clues",
    descriptionCn: "寻找失物、找回时机与位置线索",
    icon: "search",
    questionCount: 10,
    guideCount: 3,
  },
  {
    slug: "pet-health",
    name: "Pet Health",
    nameCn: "宠物健康",
    description: "Pet wellness, health predictions, and care guidance",
    descriptionCn: "宠物健康、健康预测与护理指引",
    icon: "dog",
    questionCount: 8,
    guideCount: 2,
  },
  {
    slug: "investment",
    name: "Investment",
    nameCn: "投资",
    description: "Investment timing, market trends, and financial decisions",
    descriptionCn: "投资时机、市场趋势与财务决策",
    icon: "trending-up",
    questionCount: 14,
    guideCount: 4,
  },
];

export default function KnowledgeTopicsSection({
  topics = defaultTopics,
}: KnowledgeTopicsSectionProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">
            {isZh ? "探索更多人生问题" : "Explore More Questions"}
          </h2>
          <p className="text-lg text-white/70 max-w-xl mx-auto">
            {isZh
              ? "浏览不同主题，寻找属于你的答案。"
              : "Browse life topics and discover guides, articles and answers from Eastern wisdom."}
          </p>
        </div>

        {/* Grid */}
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
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-stellawei-purple/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-stellawei-purple" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-white mb-1">
                    {isZh ? topic.nameCn : topic.name}
                  </h3>

                  {/* Meta */}
                  <p className="text-xs text-white/60 mb-3">
                    {topic.guideCount} {isZh ? "指南" : "Guides"} · {topic.questionCount}{" "}
                    {isZh ? "问题" : "Questions"}
                  </p>

                  {/* Arrow */}
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
  );
}
