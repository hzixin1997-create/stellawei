'use client';

import { useTranslation } from "react-i18next";
import type { TopicData } from "@/lib/knowledge-data";
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

interface HeroProps {
  topic: TopicData;
  question: string;
  questionCn: string;
  intro: string;
  introCn: string;
}

export default function Hero({ topic, question, questionCn, intro, introCn }: HeroProps) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";

  const Icon = iconMap[topic.icon] || Compass;

  return (
    <section className="pt-20 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Topic Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-stellawei-purple/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-stellawei-purple" />
          </div>
          <span className="text-sm font-medium text-stellawei-purple">
            {isZh ? topic.nameCn : topic.name}
          </span>
        </div>

        {/* Question Title */}
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4 leading-tight">
          {isZh ? questionCn : question}
        </h1>

        {/* Introduction */}
        <p className="text-base text-white/70 leading-relaxed max-w-3xl">
          {isZh ? introCn : intro}
        </p>
      </div>
    </section>
  );
}
