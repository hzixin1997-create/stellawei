'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FAQItem {
  question: string;
  questionZh: string;
  answer: string;
  answerZh: string;
}

const faqData: FAQItem[] = [
  {
    question: "What can I ask during a consultation?",
    questionZh: "咨询时可以问什么问题？",
    answer: "You can ask about relationships, career decisions, wealth opportunities, home feng shui, personal direction, and other important questions in your life. Our practitioners provide personalized guidance based on traditional wisdom systems including Tarot, BaZi, Feng Shui, Qi Men Dun Jia, and Liu Yao.",
    answerZh: "您可以咨询感情关系、职业决策、财富机遇、家居风水、人生方向等重要问题。我们的师傅基于塔罗、八字、风水、奇门遁甲、六爻等传统智慧体系提供个性化指导。"
  },
  {
    question: "Are consultations provided by AI?",
    questionZh: "咨询是由AI提供的吗？",
    answer: "No. Every consultation is conducted by real human practitioners. AI technology is only used to improve the platform experience, such as scheduling and customer support.",
    answerZh: "不是。每次咨询都由真人师傅进行。AI技术仅用于提升平台体验，如预约安排和客服支持。"
  },
  {
    question: "How do I choose the right consultation service?",
    questionZh: "如何选择适合的咨询服务？",
    answer: "Different systems focus on different types of questions:\n- Tarot: emotional reflection, relationships, personal guidance.\n- BaZi: personality patterns, life timing, career direction.\n- Feng Shui: home environment and energy adjustment.\n- Qi Men Dun Jia: timing and decision-making.\nIf you are unsure, you can choose based on your question or contact us for guidance.",
    answerZh: "不同体系侧重不同类型的问题：\n- 塔罗：情感反思、人际关系、个人指引\n- 八字：性格格局、人生运势、事业方向\n- 风水：家居环境与能量调理\n- 奇门遁甲：时机把握与决策分析\n如果不确定，可以根据您的问题选择，或联系我们获取建议。"
  },
  {
    question: "How does an online consultation work?",
    questionZh: "在线咨询如何进行？",
    answer: "1. Choose a practitioner.\n2. Select an available time.\n3. Complete payment.\n4. Join your private consultation session.\nYou can communicate directly with your practitioner through our online platform.",
    answerZh: "1. 选择一位师傅\n2. 选择可预约时间\n3. 完成支付\n4. 进入您的私人咨询会话\n您可以通过我们的在线平台与师傅直接沟通。"
  },
  {
    question: "Are my consultation details private?",
    questionZh: "咨询内容是否保密？",
    answer: "Yes. All conversations are private between you and your practitioner. We respect your personal information and maintain confidentiality throughout the consultation process.",
    answerZh: "是的。所有对话仅在您和师傅之间保密。我们尊重您的个人信息，并在整个咨询过程中严格保密。"
  },
  {
    question: "Why choose StellaWei instead of a random online reading?",
    questionZh: "为什么选择Stellawei而不是其他在线占卜？",
    answer: "StellaWei focuses on connecting users with verified practitioners. We provide:\n- Transparent pricing\n- Verified practitioner profiles\n- Secure online consultations\n- No exaggerated promises or fear-based selling",
    answerZh: "Stellawei专注于为用户对接经过认证的师傅。我们提供：\n- 透明的定价\n- 认证的师傅档案\n- 安全的在线咨询\n- 无夸大承诺，无恐吓营销"
  }
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  return (
    <div className="border-b border-white/10">
      <button
        onClick={onToggle}
        className="w-full py-5 px-2 flex items-center justify-between text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6a45ba]/50 rounded-lg"
        aria-expanded={isOpen}
      >
        <span className="text-base sm:text-lg font-medium text-white pr-4 group-hover:text-[#6a45ba] transition-colors">
          {isZh ? item.questionZh : item.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#6a45ba] flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="pb-5 px-2 text-white/70 text-sm sm:text-base leading-relaxed whitespace-pre-line">
          {isZh ? item.answerZh : item.answer}
        </div>
      </div>
    </div>
  );
}

export function FAQSection() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-4">
            {isZh ? '常见问题' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            {isZh ? '开始咨询前需要了解的一切。' : 'Everything you need to know before starting your consultation.'}
          </p>
        </div>

        <div className="bg-black/70 backdrop-blur-sm rounded-3xl p-6 sm:p-10 border border-white/10">
          {faqData.map((item, index) => (
            <FAQAccordion
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function FAQSchema() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer.replace(/\n/g, ' ')
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
    />
  );
}
