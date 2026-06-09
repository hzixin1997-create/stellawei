'use client';

import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

import { useTranslation } from 'react-i18next';

interface Review {
  id: string;
  content: string;
  contentEn: string;
  rating: number;
  author: string;
  location: string;
  locationEn: string;
  masterName: string;
  masterNameEn: string;
}

// 首页展示的评价（写死，如需更换请直接修改此数组）
const reviews: Review[] = [
  {
    id: '63391373-011d-46bc-b303-baa673ff997e',
    content: '老师看牌很仔细很用心！无论是分析还是最后的总结，给的建议都很棒！以后有什么问题还想继续找老师看！',
    contentEn: "The master was incredibly thorough and thoughtful! Both the analysis and the final summary were excellent, and the advice given was truly valuable. I'll definitely come back for more readings in the future!",
    rating: 5,
    author: 'D',
    location: '日本',
    locationEn: 'Japan',
    masterName: 'Luna师傅',
    masterNameEn: 'Master Luna',
  },
  {
    id: 'e80fd822-313d-4499-8c73-c8e80014b583',
    content: '已经是回头客了，张大师本人超级帅，而且知识特别渊博！算的特别准，给的建议也特别好，十分推荐！下次还来！',
    contentEn: "I'm a returning client now. Master Zhang is not only incredibly handsome but also profoundly knowledgeable! The reading was remarkably accurate, and the advice was genuinely helpful. Highly recommend! I'll definitely return!",
    rating: 5,
    author: 'V**a',
    location: '中国',
    locationEn: 'China',
    masterName: '张易桦师傅',
    masterNameEn: 'Master Zhang Yihua',
  },
  {
    id: '90b88502-1d7e-43ec-89a3-d188c7e60f52',
    content: '很准，成功把我这个唯物主义者掰弯，推荐这位张大师！不说了我要去预约7日后大师深度破局！',
    contentEn: "So accurate! It completely converted this materialist. I highly recommend Master Zhang! No more talking — I'm going to book a deep breakthrough session for 7 days from now!",
    rating: 5,
    author: '冯*颖',
    location: '中国',
    locationEn: 'China',
    masterName: '张易桦师傅',
    masterNameEn: 'Master Zhang Yihua',
  },
  {
    id: 'ddd16030-31e7-46e3-a7d2-f61c6559d4a1',
    content: '第一次抱着试一试的态度下了单，结果Luna师傅很耐心的帮我梳理了内心的情感和工作纠结，有种豁然开朗的感觉，整个人都不那么焦虑了，非常感谢，已经推荐了朋友也来试试！',
    contentEn: "I placed my first order with a 'let's see' attitude. Master Luna patiently helped me untangle my emotions and work dilemmas. It felt like a revelation — I'm so much less anxious now. Thank you so much, and I've already recommended a friend to try it too!",
    rating: 5,
    author: 'L**a',
    location: '新加坡',
    locationEn: 'Singapore',
    masterName: 'Luna师傅',
    masterNameEn: 'Master Luna',
  },
  {
    id: '4522adb3-5f67-430f-b77b-d5437105c34e',
    content: '张师傅耐心细致，解答疑惑不厌其烦，推测的情况与事实非常相符，并且提供了很有用的建议，非常感谢！强烈推荐！！！',
    contentEn: "Master Zhang was patient and meticulous, tirelessly answering all my questions. The predictions aligned remarkably well with reality, and the advice provided was extremely useful. Thank you so much! Highly recommend!!!",
    rating: 5,
    author: 'W*n',
    location: '中国',
    locationEn: 'China',
    masterName: '张易桦师傅',
    masterNameEn: 'Master Zhang Yihua',
  },
];

export default function Testimonials() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % reviews.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index: number) => setCurrent(index);
  const prev = () => setCurrent((prev) => (prev - 1 + reviews.length) % reviews.length);
  const next = () => setCurrent((prev) => (prev + 1) % reviews.length);

  const review = reviews[current];

  return (
    <section className="py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
            {isZh ? '用户评价' : 'What Our Clients Say'}
          </h2>
          <p className="text-white/70 max-w-xl mx-auto">
            {isZh 
              ? '真实用户，真实体验，真实改变' 
              : 'Real people, real experiences, real transformations'}
          </p>
        </div>

        <div className="relative">
          <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-8 sm:p-10 shadow-sm border border-white/10">
            <Quote className="w-10 h-10 text-stellawei-purple mb-4" />
            
            <p className="text-lg sm:text-xl text-white/90 leading-relaxed mb-8 min-h-[80px]">
              {isZh ? review.content : review.contentEn}
            </p>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-sw-accent-soft flex items-center justify-center">
                <span className="text-sw-accent font-semibold text-lg">
                  {review.author[0]}
                </span>
              </div>
              <div>
                <div className="font-semibold text-white">{review.author}</div>
                <div className="text-sm text-sw-text-secondary">
                  {isZh ? review.location : review.locationEn} · {isZh ? review.masterName : review.masterNameEn}
                </div>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-sw-gold fill-sw-gold" />
                ))}
              </div>
            </div>
          </div>

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
                  className={`h-2 rounded-full transition-all ${
                    i === current 
                      ? 'bg-sw-accent w-6' 
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
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
