// ============================================================
// Knowledge Article Data — V2.0
// Search Intent Driven · AEO Ready · EEAT Enhanced
// 所有内容必须先回答「用户真正想知道什么」，再回答「我们可以如何帮助」
// ============================================================

// ==================== 类型定义 ====================

export interface QuickAnswerSection {
  paragraphs: string[];
  bullets?: string[];
}

export interface WhyPeopleAskSection {
  intro: string;
  questions: string[];
}

export interface ReadingSummarySection {
  items: string[];
  itemsCn: string[];
}

export interface EasternWisdomTool {
  searchHeading: string;
  searchHeadingCn: string;
  description: string;
  descriptionCn: string;
  suitableFor: string[];
  suitableForCn: string[];
}

export interface EasternWisdomSection {
  tools: EasternWisdomTool[];
}

export interface WhatReallyMattersSection {
  intro: string;
  introCn: string;
  points: string[];
  pointsCn: string[];
}

export interface BenefitChecklistSection {
  intro: string;
  introCn: string;
  items: string[];
  itemsCn: string[];
}

export interface CaseStudy {
  title: string;
  titleCn: string;
  content: string;
  contentCn: string;
}

export interface FAQItem {
  question: string;
  questionCn: string;
  answer: string;
  answerCn: string;
}

export interface KeyTakeawaysSection {
  items: string[];
  itemsCn: string[];
}

export interface RelatedQuestion {
  slug: string;
  question: string;
  questionCn: string;
}

export interface EastWestSection {
  heading: string;
  headingCn: string;
  easternTitle: string;
  easternTitleCn: string;
  easternDesc: string;
  easternDescCn: string;
  westernTitle: string;
  westernTitleCn: string;
  westernDesc: string;
  westernDescCn: string;
}

export interface MethodSubSection {
  title: string;
  titleCn: string;
  intro?: string;
  introCn?: string;
  desc?: string;
  descCn?: string;
  focus?: string;
  focusCn?: string;
  items?: string[];
  itemsCn?: string[];
  conclusion?: string;
  conclusionCn?: string;
  cards?: { title: string; titleCn: string; desc: string; descCn: string; items: string[]; itemsCn: string[] }[];
}

export interface MethodsSection {
  heading: string;
  headingCn: string;
  sections: MethodSubSection[];
}

export interface CaseStudySection {
  title: string;
  titleCn: string;
  sections: { label: string; labelCn: string; text: string; textCn: string }[];
  disclaimer: string;
  disclaimerCn: string;
}

export interface CTASection {
  textLine1: string;
  textLine1Cn: string;
  textLine2: string;
  textLine2Cn: string;
  button: string;
  buttonCn: string;
  link: string;
}

export interface EEATInfo {
  reviewedBy: string;
  reviewedByCn: string;
}

export interface SearchIntent {
  primary: string[];
  primaryCn: string[];
  secondary: string[];
  secondaryCn: string[];
  related: string[];
  relatedCn: string[];
}

export interface KnowledgeArticle {
  slug: string;
  topicSlug: string;
  question: string;
  questionCn: string;
  metaTitle: string;
  metaDescription: string;
  metaTitleCn: string;
  metaDescriptionCn: string;
  heroIntro: string;
  heroIntroCn: string;
  searchIntent: SearchIntent;
  whyPeopleAsk: WhyPeopleAskSection;
  whyPeopleAskCn: WhyPeopleAskSection;
  eastWest: EastWestSection;
  methods: MethodsSection;
  caseStudy: CaseStudySection;
  keyTakeaways: KeyTakeawaysSection;
  relatedQuestions: RelatedQuestion[];
  cta: CTASection;
  eeat: EEATInfo;
  canonicalUrl: string;
  publishedAt: string;
  modifiedAt: string;
  author: string;
}

// ==================== 示例文章：When Will I Meet My True Love (V2.0) ====================

export const whenWillIMeetMyTrueLove: KnowledgeArticle = {
  slug: "when-will-i-meet-my-soulmate",
  topicSlug: "relationship",
  question: "When Will I Meet My True Love?",
  questionCn: "我的正缘什么时候出现？",
  metaTitle: "When Will I Meet My True Love? | StellaWei Knowledge Center",
  metaDescription: "No method can predict the exact day. But Eastern and Western divination tools offer different lenses to help you understand relationship timing, partner traits, and your current emotional state.",
  metaTitleCn: "我的正缘什么时候出现？| Stellawei 知识中心",
  metaDescriptionCn: "没有任何命理方法能准确预测具体日期。但东西方命理工具可以从不同维度帮助你理解正缘出现的可能性与方向。",
  heroIntro: "Many people begin asking this question after a breakup, years of being single, or watching friends around them fall in love and get married. Both Eastern and Western divination tools offer different lenses—Eastern methods focus on birth-time patterns and long-term cycles, while Tarot reflects your current emotional state and subconscious needs.",
  heroIntroCn: "许多人在分手、多年单身，或看着身边的朋友陆续恋爱、结婚后，开始问这些问题。东西方命理工具提供了不同的视角——东方方法侧重于出生时间规律与长期周期，而塔罗则反映你当下的情感状态与潜意识需求。",

  searchIntent: {
    primary: [
      "when will i meet my true love",
      "when will i meet my soulmate",
      "when is my true love coming"
    ],
    primaryCn: [
      "我的正缘什么时候出现",
      "我什么时候会遇到对的人",
      "我的真爱什么时候来"
    ],
    secondary: [
      "relationship timing bazi",
      "tarot relationship reading",
      "when will i get married"
    ],
    secondaryCn: [
      "八字看正缘时间",
      "塔罗看感情发展",
      "什么时候结婚"
    ],
    related: [
      "soulmate signs",
      "relationship patterns",
      "love fortune",
      "marriage timing"
    ],
    relatedCn: [
      "正缘特征",
      "感情模式",
      "桃花运",
      "婚姻时机"
    ]
  },


  whyPeopleAsk: {
    intro: "Many people asking this question are actually wondering:",
    questions: [
      "When will the right person for me actually appear?",
      "Why does everyone else seem happy while I keep meeting the wrong people?",
      "Why do the people I like not like me back, and the people who like me are not my type?",
      "Why do I always end up with the wrong person?",
      "I am exhausted—does persisting in this relationship really have hope?"
    ]
  },
  whyPeopleAskCn: {
    intro: "许多人在分手、多年单身，或看着身边的朋友陆续恋爱、结婚后，开始问这些问题：",
    questions: [
      "想知道适合自己的另一半究竟何时会出现",
      "为什么别人那么幸福，到了自己这里，总是这个不合适，那个有问题？",
      "为什么喜欢的人不喜欢你，喜欢你的你又不喜欢？",
      "为什么我总是遇到错的人？",
      "我已经很累了，坚持这段关系真的能看到希望吗？"
    ]
  },

  eastWest: {
    heading: "How Eastern and Western Divination Approach Relationship Timing",
    headingCn: "东西方命理如何看待感情时机",
    easternTitle: "Eastern Divination",
    easternTitleCn: "东方命理",
    easternDesc: "Eastern methods (BaZi, Qi Men Dun Jia, Zi Wei Dou Shu) analyze relationship timing through birth-time patterns, elemental harmony, and palace interactions. BaZi identifies favorable years through Spouse Star and Spouse Palace analysis. Qi Men Dun Jia evaluates current energy and optimal timing for action. Zi Wei Dou Shu profiles relationship patterns and emotional stability through star combinations across twelve palaces.",
    easternDescCn: "东方方法（八字、奇门遁甲、紫微斗数）通过出生时间规律、五行和谐与宫位互动来分析感情时机。八字通过配偶星和配偶宫分析识别有利年份。奇门遁甲评估当前能量和行动的最佳时机。紫微斗数通过十二宫位星曜组合描绘关系模式和情感稳定性。",
    westernTitle: "Western Divination",
    westernTitleCn: "西方命理",
    westernDesc: "Western divination (primarily Tarot) is based on symbolic psychology and the collective unconscious. Through card imagery and intuitive interpretation, it reflects your present emotional state and subconscious needs, reveals hidden fears and blocks, and offers actionable guidance for navigating your current relationship situation.",
    westernDescCn: "西方命理（以塔罗为主）基于象征心理学与集体潜意识。通过牌面图像与直觉解读，反映当下情感状态与潜意识需求，揭示隐藏的恐惧和阻碍，并提供可执行的指引来应对当前的感情状况。"
  },

  methods: {
    heading: "Specific Methods",
    headingCn: "具体方法",
    sections: [
      {
        title: "1. BaZi: Spouse Star and Palace Analysis",
        titleCn: "一、八字：配偶星与配偶宫分析",
        intro: "BaZi uses your birth year, month, day, and hour to construct a Four Pillars chart. For relationship timing, the analysis typically focuses on:",
        introCn: "八字使用你的出生年月日时构建四柱命盘。针对感情时机，分析通常关注：",
        cards: [
          {
            title: "① Spouse Star Location",
            titleCn: "① 配偶星位置",
            desc: "The Spouse Star in your chart reveals partner characteristics and timing.",
            descCn: "命盘中的配偶星揭示伴侣特征和时机。",
            items: ["Star strength and quality", "Timing of activation", "Partner characteristics"],
            itemsCn: ["星体强度和质量", "激活时机", "伴侣特征"]
          },
          {
            title: "② Spouse Palace Stability",
            titleCn: "② 配偶宫稳定性",
            desc: "The marriage palace indicates relationship stability and timing.",
            descCn: "婚姻宫指示关系稳定性和时机。",
            items: ["Palace element analysis", "Conflict indicators", "Marriage timing"],
            itemsCn: ["宫位五行分析", "冲突指标", "婚姻时机"]
          },
          {
            title: "③ Luck Cycle Alignment",
            titleCn: "③ 大运流年对齐",
            desc: "Major luck cycles reveal when relationship opportunities are most likely.",
            descCn: "大运周期揭示关系机会最可能出现的时间。",
            items: ["Current cycle impact", "Favorable years", "Timing windows"],
            itemsCn: ["当前周期影响", "有利年份", "时机窗口"]
          }
        ]
      },
      {
        title: "2. Qi Men Dun Jia: Current Energy Assessment",
        titleCn: "二、奇门遁甲：当前能量评估",
        desc: "Qi Men Dun Jia uses a spacetime model to analyze the current energy state and optimal timing for relationship actions.",
        descCn: "奇门遁甲使用时空模型分析当前能量状态和行动的最佳时机。",
        focus: "Key areas of focus:",
        focusCn: "通常重点关注：",
        items: ["Current romantic energy", "Optimal timing for action", "Hidden obstacles", "Relationship trajectory"],
        itemsCn: ["当前浪漫能量", "行动最佳时机", "隐藏阻碍", "关系轨迹"]
      },
      {
        title: "3. Zi Wei Dou Shu: Relationship Pattern Analysis",
        titleCn: "三、紫微斗数：关系模式分析",
        desc: "Zi Wei Dou Shu uses star combinations to profile relationship patterns, emotional stability, and timing through the twelve palaces.",
        descCn: "紫微斗数使用星曜组合描绘关系模式、情感稳定度和时机。",
        focus: "Key areas of focus:",
        focusCn: "通常重点关注：",
        items: ["Relationship structure", "Emotional patterns", "Favorable periods", "Marriage timing"],
        itemsCn: ["关系结构", "情感模式", "有利时期", "婚姻时机"]
      }
    ]
  },

  caseStudy: {
    title: "Finding Love Through Timing Awareness",
    titleCn: "通过时机意识找到爱情",
    sections: [
      {
        label: "Background",
        labelCn: "基本情况",
        text: "Ms. Chen (born 1990, Geng-Wu year) had been single for five years. She was frustrated and wondered if she would ever meet the right person.",
        textCn: "陈女士（1990年生，庚午年）已单身五年。她感到沮丧，不知道是否能遇到对的人。"
      },
      {
        label: "BaZi Analysis",
        labelCn: "八字分析",
        text: "Ms. Chen's chart showed her Spouse Star would activate in 2023, during a favorable luck cycle. Her Spouse Palace indicated a stable partner with Earth-element characteristics.",
        textCn: "陈女士的命盘显示她的配偶星将在2023年激活，处于有利的大运周期。她的配偶宫指示一个具有土元素特征的稳定伴侣。"
      },
      {
        label: "Guidance",
        labelCn: "指导建议",
        text: "Prepare for 2023 by expanding social circles and being open to new connections. Look for someone stable, practical, and supportive.",
        textCn: "通过扩大社交圈和开放接受新联系来为2023年做准备。寻找一个稳定、务实、支持性强的伴侣。"
      },
      {
        label: "Outcome",
        labelCn: "实际结果",
        text: "Ms. Chen met her partner in early 2023 at a professional networking event. They married in 2024 and report deep compatibility and mutual support.",
        textCn: "陈女士在2023年初的一个专业社交活动中遇到了她的伴侣。他们于2024年结婚，报告了深刻的兼容性和相互支持。"
      }
    ],
    disclaimer: "Case is anonymized. Results vary by individual. Consultations aim to help you understand your situation, not guarantee outcomes.",
    disclaimerCn: "案例已匿名化处理。结果因人而异，咨询旨在帮助理解问题，而非保证结果。"
  },

  keyTakeaways: {
    items: [
      "Eastern systems (BaZi, Qi Men, Zi Wei) rely on Yin-Yang, Five Elements, and celestial patterns for long-term forecasting of relationship timing, partner traits, and marriage compatibility.",
      "Western Tarot interprets subconscious symbolism to illuminate your current emotional state and provide mindset and action guidance.",
      "Different methods serve different purposes; the right tool depends on whether you need structural insight, current-clarity, or both."
    ],
    itemsCn: [
      "东方八字、奇门、紫微依托阴阳五行、星象干支做长期推演，可预判正缘时间、对方特质、婚姻适配度。",
      "西方塔罗基于潜意识象征解读，聚焦短期当下情感状态，提供心态与行动指引。",
      "不同解决方式各有适用场景，通过适合的方法辅助客户做出情感选择。"
    ]
  },

  relatedQuestions: [
    { slug: "is-he-she-the-right-person", question: "Is He/She the Right Person?", questionCn: "他/她是对的人吗？" },
    { slug: "should-i-stay-or-leave", question: "Should I Stay or Leave This Relationship?", questionCn: "我应该继续还是离开这段关系？" },
    { slug: "can-we-fix-this-relationship", question: "Can We Fix This Relationship?", questionCn: "我们能修复这段关系吗？" }
  ],

  cta: {
    textLine1: "Every relationship is unique.",
    textLine1Cn: "每段关系都是独特的。",
    textLine2: "If you would like a more personalized analysis combining your birth information, current relationship status, or specific questions, our consultants can provide guidance tailored to your situation.",
    textLine2Cn: "如果你想要更个性化的分析，我们的咨询师可以根据你的具体情况提供指引。",
    button: "Book a Relationship Consultation",
    buttonCn: "预约感情咨询",
    link: "/booking"
  },

  eeat: {
    reviewedBy: "Reviewed by StellaWei Editorial Team",
    reviewedByCn: "由 Stellawei 编辑团队审阅"
  },

  canonicalUrl: "https://stellawei.org/knowledge/relationship/when-will-i-meet-my-true-love",
  publishedAt: "2026-07-25",
  modifiedAt: "2026-07-27",
  author: "Stellawei Editorial Team"
};

import {
  isHeSheTheRightPerson,
  shouldIStayOrLeave,
  howToFixARelationship,
  shouldIContactMyEx,
  whenIsTheBestTimeToStartDating,
} from "./knowledge-article-pages";

// ==================== 文章索引 ====================

export const knowledgeArticles: Record<string, KnowledgeArticle> = {
  [whenWillIMeetMyTrueLove.slug]: whenWillIMeetMyTrueLove,
  [isHeSheTheRightPerson.slug]: isHeSheTheRightPerson,
  [shouldIStayOrLeave.slug]: shouldIStayOrLeave,
  [howToFixARelationship.slug]: howToFixARelationship,
  [shouldIContactMyEx.slug]: shouldIContactMyEx,
  [whenIsTheBestTimeToStartDating.slug]: whenIsTheBestTimeToStartDating,
};

export function getArticleBySlug(slug: string): KnowledgeArticle | undefined {
  return knowledgeArticles[slug];
}

export function getArticlesByTopic(topicSlug: string): KnowledgeArticle[] {
  return Object.values(knowledgeArticles).filter(a => a.topicSlug === topicSlug);
}
