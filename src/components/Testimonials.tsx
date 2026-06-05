'use client';

import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

interface Review {
  id: number;
  text: string;
  textZh: string;
  author: string;
  role: string;
  roleZh: string;
  avatar: string;
  rating: number;
}

const reviews: Review[] = [
  {
    id: 1,
    text: "Master Luna helped me see clearly during a career transition. Three months later, I got the promotion she predicted. The guidance was specific and actionable.",
    textZh: "卢娜师傅在我职业转型期帮我看清了方向。三个月后，她预测的升职真的发生了。指导非常具体且可执行。",
    author: "Sarah L.",
    role: "Marketing Director",
    roleZh: "市场总监",
    avatar: "/avatars/sarah.jpg",
    rating: 5,
  },
  {
    id: 2,
    text: "I was skeptical at first, but Master Wu Yang's BaZi reading was incredibly accurate about my relationship patterns. It helped me understand myself better.",
    textZh: "起初我持怀疑态度，但戊阳师傅的八字分析对我感情模式的判断非常准确。帮助我更好地理解了自己。",
    author: "Michael T.",
    role: "Software Engineer",
    roleZh: "软件工程师",
    avatar: "/avatars/michael.jpg",
    rating: 5,
  },
  {
    id: 3,
    text: "The Qi Men Dun Jia session with Master Zhang gave me clarity on a major business decision. His insights on timing were spot-on.",
    textZh: "张易桦师傅的奇门遁甲咨询为我的重大商业决策提供了清晰方向。他对时机的判断非常精准。",
    author: "David K.",
    role: "Entrepreneur",
    roleZh: "创业者",
    avatar: "/avatars/david.jpg",
    rating: 5,
  },
  {
    id: 4,
    text: "I've tried many online readings before. Stellawei is different — real masters, real conversations, real results. Worth every penny.",
    textZh: "之前尝试过许多在线占卜。Stellawei 不一样——真人师傅、真实对话、真实效果。物超所值。",
    author: "Emily R.",
    role: "UX Designer",
    roleZh: "UX设计师",
    avatar: "/avatars/emily.jpg",
    rating: 5,
  },
  {
    id: 5,
    text: "The 7-day refund policy gave me confidence to try. After my first session, I knew I'd be back. The masters here are genuinely gifted.",
    textZh: "7天退款保障让我有信心尝试。第一次咨询后，我就知道还会再来。这里的师傅真正有天赋。",
    author: "James W.",
    role: "Financial Analyst",
    roleZh: "金融分析师",
    avatar: "/avatars/james.jpg",
    rating: 5,
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [isZh, setIsZh] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => {
    setCurrent(index);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const next = () => {
    setCurrent((prev) => (prev + 1) % reviews.length);
  };

  const review = reviews[current];

  return (
    <section className="py-24 bg-[#faf7fa]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-sw-text mb-4">
            {isZh ? '用户评价' : 'What Our Clients Say'}
          </h2>
          <p className="text-sw-text-secondary max-w-xl mx-auto">
            {isZh 
              ? '真实用户，真实体验，真实改变' 
              : 'Real people, real experiences, real transformations'}
          </p>
        </div>

        <div className="relative">
          {/* Main Card */}
          <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100">
            <Quote className="w-10 h-10 text-sw-accent/20 mb-4" />
            
            <p className="text-lg sm:text-xl text-sw-text leading-relaxed mb-8 min-h-[80px]">
              {isZh ? review.textZh : review.text}
            </p>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-sw-accent-soft flex items-center justify-center">
                <span className="text-sw-accent font-semibold text-lg">
                  {review.author[0]}
                </span>
              </div>
              <div>
                <div className="font-semibold text-sw-text">{review.author}</div>
                <div className="text-sm text-sw-text-secondary">
                  {isZh ? review.roleZh : review.role}
                </div>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-sw-gold fill-sw-gold" />
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-sw-text-secondary" />
            </button>

            <div className="flex gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === current 
                      ? 'bg-sw-accent w-6' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-sw-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
