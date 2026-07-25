// ============================================================
// Knowledge Article Data — V2.0
// Search Intent Driven · AEO Ready · EEAT Enhanced
// 所有内容必须先回答"用户真正想知道什么"，再回答"我们可以如何帮助"
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
  searchHeading: string;      // V2.0: 用户搜索式标题
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

export interface CTASection {
  text: string;
  textCn: string;
  buttonText: string;
  buttonTextCn: string;
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

  // V2.0: Search Intent Mapping (后台数据)
  searchIntent: SearchIntent;

  quickAnswer: QuickAnswerSection;
  quickAnswerCn: QuickAnswerSection;

  // V2.0: 新增 - 阅读这篇文章，你将了解
  readingSummary: ReadingSummarySection;

  whyPeopleAsk: WhyPeopleAskSection;
  whyPeopleAskCn: WhyPeopleAskSection;

  easternWisdom: EasternWisdomSection;
  easternWisdomCn: EasternWisdomSection;

  whatReallyMatters: WhatReallyMattersSection;
  whatReallyMattersCn: WhatReallyMattersSection;

  benefitChecklist: BenefitChecklistSection;
  benefitChecklistCn: BenefitChecklistSection;

  // V2.0: 新增 - 真实案例
  caseStudies: CaseStudy[];

  faq: FAQItem[];

  // V2.0: 新增 - Key Takeaways
  keyTakeaways: KeyTakeawaysSection;

  relatedQuestions: RelatedQuestion[];

  cta: CTASection;

  // V2.0: 新增 - EEAT
  eeat: EEATInfo;

  // SEO
  canonicalUrl: string;
  publishedAt: string;
  modifiedAt: string;
  author: string;
}

// ==================== 示例文章：When Will I Meet My True Love (V2.0) ====================

export const whenWillIMeetMyTrueLove: KnowledgeArticle = {
  slug: "when-will-i-meet-my-true-love",
  topicSlug: "relationship",
  question: "When Will I Meet My True Love?",
  questionCn: "我的正缘什么时候出现？",
  metaTitle: "When Will I Meet My True Love? | StellaWei Knowledge Center",
  metaDescription: "No method can predict the exact day. But Eastern wisdom may help you understand your relationship timing, patterns, and favorable periods.",
  metaTitleCn: "我的正缘什么时候出现？| Stellawei 知识中心",
  metaDescriptionCn: "没有任何方法能准确预测具体日期。但东方智慧可以帮助你理解感情时机、模式和有利时期。",
  heroIntro: "Many people begin asking this question after a breakup, years of being single, or watching friends around them get married. Eastern wisdom focuses less on predicting an exact date, and more on understanding whether you are entering a stage that supports meaningful relationships.",
  heroIntroCn: "许多人在分手、多年单身，或看着身边的朋友陆续结婚后，开始问这个问题。东方智慧的重点不在于预测具体日期，而在于理解你是否正在进入一个有利于建立有意义关系的阶段。",

  // V2.0: Search Intent Mapping
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

  quickAnswer: {
    paragraphs: [
      "No method can accurately tell you the exact day you will meet your true love.",
      "However, Eastern wisdom (BaZi, Qi Men Dun Jia, Tarot) may help you understand your relationship patterns and timing."
    ],
    bullets: [
      "Whether you are entering a favorable relationship period",
      "What type of relationships you tend to attract",
      "What repeating emotional patterns may exist",
      "Which years may offer stronger opportunities"
    ]
  },
  quickAnswerCn: {
    paragraphs: [
      "没有任何方法能准确告诉你将在哪一天遇到正缘。",
      "然而，东方智慧（八字、奇门遁甲、塔罗）可以帮助你理解自己的感情模式和时机。"
    ],
    bullets: [
      "你是否正在进入一个有利的感情阶段",
      "你倾向于吸引什么类型的关系",
      "可能存在什么重复的情感模式",
      "哪些年份可能提供更强的机会"
    ]
  },

  // V2.0: 新增 - 阅读这篇文章，你将了解
  readingSummary: {
    items: [
      "Why many people keep meeting the wrong type of partner",
      "What BaZi can reveal about relationship timing",
      "When Qi Men Dun Jia is more useful than BaZi",
      "What Tarot can and cannot tell you about love",
      "When a consultation might actually help"
    ],
    itemsCn: [
      "为什么很多人总是遇到不适合自己的人",
      "八字可以揭示哪些关于感情时机的信息",
      "什么时候奇门遁甲比八字更有用",
      "塔罗能告诉你什么、不能告诉你什么",
      "什么情况下咨询可能真的有帮助"
    ]
  },

  whyPeopleAsk: {
    intro: "Many people asking \"When will I meet my true love?\" are actually wondering:",
    questions: [
      "Am I already too late?",
      "Why do I keep meeting the wrong people?",
      "Is there something wrong with me?",
      "Will I ever experience a stable relationship?"
    ]
  },
  whyPeopleAskCn: {
    intro: "很多问\"我的正缘什么时候出现？\"的人，真正想问的是：",
    questions: [
      "我是不是已经太晚了？",
      "为什么我总是遇到错的人？",
      "是不是我有什么问题？",
      "我还会拥有稳定的关系吗？"
    ]
  },

  // V2.0: Eastern Wisdom - 搜索式标题
  easternWisdom: {
    tools: [
      {
        searchHeading: "Can BaZi reveal when you are most likely to meet someone meaningful?",
        searchHeadingCn: "八字可以分析什么时候遇到正缘吗？",
        description: "BaZi analyzes your birth chart to identify relationship timing, life cycles, and personality tendencies that influence who you attract. It does not predict exact dates, but can highlight periods when relationship energy is stronger.",
        descriptionCn: "八字通过分析你的出生命盘，识别感情时机、生命周期和性格倾向。它不能预测具体日期，但可以突出感情能量较强的时期。",
        suitableFor: ["Understanding relationship timing", "Identifying life cycle patterns", "Personality compatibility analysis"],
        suitableForCn: ["理解感情时机", "识别生命周期模式", "性格配对分析"]
      },
      {
        searchHeading: "When is Qi Men Dun Jia more useful than BaZi for relationship decisions?",
        searchHeadingCn: "奇门遁甲适合解决哪些感情决策问题？",
        description: "Qi Men Dun Jia excels at current decision-making: whether to pursue a relationship, wait, or focus on self-growth. It answers \"what should I do now?\" rather than \"when will it happen?\"",
        descriptionCn: "奇门遁甲擅长当前决策：是否追求一段感情、等待，还是专注于自我成长。它回答\"我现在应该做什么？\"而非\"这件事什么时候会发生？\"",
        suitableFor: ["Current decision-making", "Choosing between options", "Timing of action"],
        suitableForCn: ["当前决策", "在选项之间选择", "行动时机"]
      },
      {
        searchHeading: "Can Tarot provide meaningful insights about your current love situation?",
        searchHeadingCn: "塔罗适合分析近期感情发展吗？",
        description: "Tarot offers short-term emotional guidance and insight into your current relationship energy. It is most useful for understanding your present mindset and immediate emotional landscape, not long-term predictions.",
        descriptionCn: "塔罗提供短期情感指引和当前感情能量的洞察。它最适用于理解你的当下心态和即时情感状态，而非长期预测。",
        suitableFor: ["Short-term emotional guidance", "Current energy reading", "Mindset clarity"],
        suitableForCn: ["短期情感指引", "当前能量解读", "心态清晰度"]
      }
    ]
  },
  easternWisdomCn: {
    tools: [
      {
        searchHeading: "八字可以分析什么时候遇到正缘吗？",
        searchHeadingCn: "八字可以分析什么时候遇到正缘吗？",
        description: "八字通过分析你的出生命盘，识别感情时机、生命周期和性格倾向。它不能预测具体日期，但可以突出感情能量较强的时期。",
        descriptionCn: "八字通过分析你的出生命盘，识别感情时机、生命周期和性格倾向。它不能预测具体日期，但可以突出感情能量较强的时期。",
        suitableFor: ["理解感情时机", "识别生命周期模式", "性格配对分析"],
        suitableForCn: ["理解感情时机", "识别生命周期模式", "性格配对分析"]
      },
      {
        searchHeading: "奇门遁甲适合解决哪些感情决策问题？",
        searchHeadingCn: "奇门遁甲适合解决哪些感情决策问题？",
        description: "奇门遁甲擅长当前决策：是否追求一段感情、等待，还是专注于自我成长。它回答\"我现在应该做什么？\"而非\"这件事什么时候会发生？\"",
        descriptionCn: "奇门遁甲擅长当前决策：是否追求一段感情、等待，还是专注于自我成长。它回答\"我现在应该做什么？\"而非\"这件事什么时候会发生？\"",
        suitableFor: ["当前决策", "在选项之间选择", "行动时机"],
        suitableForCn: ["当前决策", "在选项之间选择", "行动时机"]
      },
      {
        searchHeading: "塔罗适合分析近期感情发展吗？",
        searchHeadingCn: "塔罗适合分析近期感情发展吗？",
        description: "塔罗提供短期情感指引和当前感情能量的洞察。它最适用于理解你的当下心态和即时情感状态，而非长期预测。",
        descriptionCn: "塔罗提供短期情感指引和当前感情能量的洞察。它最适用于理解你的当下心态和即时情感状态，而非长期预测。",
        suitableFor: ["短期情感指引", "当前能量解读", "心态清晰度"],
        suitableForCn: ["短期情感指引", "当前能量解读", "心态清晰度"]
      }
    ]
  },

  whatReallyMatters: {
    intro: "Many people spend years waiting for \"the right person.\" But often, the more important questions are:",
    introCn: "许多人花多年时间等待\"对的人\"。但更重要的是这些问题：",
    points: [
      "Are you emotionally ready for a meaningful relationship?",
      "Are you repeating the same relationship pattern?",
      "Are you attracted to the same kind of partner every time?",
      "Do you know what you truly need—not just what you want?"
    ],
    pointsCn: [
      "你是否在情感上准备好进入一段有意义的关系？",
      "你是否在重复同样的感情模式？",
      "你是否每次都被同一类型的伴侣吸引？",
      "你知道自己真正需要什么——而不仅仅是想要什么吗？"
    ]
  },
  whatReallyMattersCn: {
    intro: "许多人花多年时间等待\"对的人\"。但更重要的是这些问题：",
    introCn: "许多人花多年时间等待\"对的人\"。但更重要的是这些问题：",
    points: [
      "你是否在情感上准备好进入一段有意义的关系？",
      "你是否在重复同样的感情模式？",
      "你是否每次都被同一类型的伴侣吸引？",
      "你知道自己真正需要什么——而不仅仅是想要什么吗？"
    ],
    pointsCn: [
      "你是否在情感上准备好进入一段有意义的关系？",
      "你是否在重复同样的感情模式？",
      "你是否每次都被同一类型的伴侣吸引？",
      "你知道自己真正需要什么——而不仅仅是想要什么吗？"
    ]
  },

  benefitChecklist: {
    intro: "This consultation may help if you:",
    introCn: "如果你有以下情况，咨询可能会对你有帮助：",
    items: [
      "Have been single for years without understanding why",
      "Keep repeating similar relationship patterns",
      "Are unsure whether someone is the right person",
      "Want to understand your relationship timing",
      "Feel stuck emotionally and want clarity"
    ],
    itemsCn: [
      "多年单身，但不知道原因",
      "一直在重复相似的感情模式",
      "不确定某个人是否是对的人",
      "想了解自己的感情时机",
      "情感上感到困惑，想要理清思路"
    ]
  },
  benefitChecklistCn: {
    intro: "如果你有以下情况，咨询可能会对你有帮助：",
    introCn: "如果你有以下情况，咨询可能会对你有帮助：",
    items: [
      "多年单身，但不知道原因",
      "一直在重复相似的感情模式",
      "不确定某个人是否是对的人",
      "想了解自己的感情时机",
      "情感上感到困惑，想要理清思路"
    ],
    itemsCn: [
      "多年单身，但不知道原因",
      "一直在重复相似的感情模式",
      "不确定某个人是否是对的人",
      "想了解自己的感情时机",
      "情感上感到困惑，想要理清思路"
    ]
  },

  // V2.0: 新增 - 真实案例
  caseStudies: [
    {
      title: "Understanding the Pattern",
      titleCn: "理解模式",
      content: "A user from Singapore had been single for four years and believed she simply had \"bad luck with relationships.\" During a BaZi consultation, she discovered that her chart showed a strong pattern of being attracted to emotionally unavailable partners. The consultation did not predict when she would meet someone. Instead, it helped her recognize the pattern she had been repeating. Six months later, she shared that she had started making different choices in dating—and felt more confident about what she actually needed in a relationship.",
      contentCn: "一位来自新加坡的用户已经单身四年，认为自己只是\"感情运不好\"。在八字咨询中，她发现自己的命盘显示出一种强烈的模式：总是被情感上不可获得的伴侣吸引。咨询没有预测她什么时候会遇到某人，而是帮助她认识到自己一直在重复的模式。六个月后，她分享说自己开始在约会中做出不同的选择——并且对自己在感情中真正需要什么更有信心。"
    }
  ],

  faq: [
    {
      question: "Can BaZi predict the exact year I will get married?",
      questionCn: "八字能预测我哪年结婚吗？",
      answer: "BaZi can identify periods when relationship energy is stronger, but it cannot predict exact dates. Life involves free will and countless variables. The value is in understanding timing patterns, not getting a specific calendar date.",
      answerCn: "八字可以识别感情能量较强的时期，但无法预测具体日期。人生涉及自由意志和无数变量。其价值在于理解时机模式，而非获得具体日期。"
    },
    {
      question: "Is Tarot suitable for relationship timing?",
      questionCn: "塔罗适合看感情时机吗？",
      answer: "Tarot is better suited for understanding current emotional energy and short-term guidance. For long-term timing patterns, BaZi or Qi Men Dun Jia may offer more structured insights.",
      answerCn: "塔罗更适合理解当前的情感能量和短期指引。对于长期时机模式，八字或奇门遁甲可能提供更系统的洞察。"
    },
    {
      question: "Can destiny be changed?",
      questionCn: "命运可以改变吗？",
      answer: "Eastern wisdom teaches that destiny provides a framework, but how you navigate within it is up to you. Understanding your patterns gives you the awareness to make different choices.",
      answerCn: "东方智慧认为命运提供了一个框架，但如何在其中航行取决于你自己。理解自己的模式会让你获得做出不同选择的意识。"
    },
    {
      question: "What's the difference between BaZi and Tarot?",
      questionCn: "八字和塔罗有什么区别？",
      answer: "BaZi analyzes your birth chart for long-term patterns and timing. Tarot reads current energy for short-term guidance. They answer different questions and work best when used for their respective strengths.",
      answerCn: "八字分析你的出生命盘，用于长期模式和时机。塔罗解读当前能量，用于短期指引。它们回答不同的问题，在各自擅长的领域使用时效果最好。"
    },
    {
      question: "How should I prepare before a consultation?",
      questionCn: "咨询前应该如何准备？",
      answer: "Think about what you truly want to understand. The more specific your question, the more useful the guidance. Have your birth date, time, and location ready for BaZi readings.",
      answerCn: "思考你真正想理解什么。问题越具体，指引就越有用。如果是八字解读，准备好你的出生日期、时间和地点。"
    }
  ],

  // V2.0: 新增 - Key Takeaways
  keyTakeaways: {
    items: [
      "No method can predict the exact day you will meet someone—timing is a pattern, not a calendar event.",
      "BaZi helps you understand long-term relationship cycles; Qi Men Dun Jia helps with current decisions; Tarot offers short-term emotional clarity.",
      "The more important question is often not \"when\" but \"what pattern am I repeating?\""
    ],
    itemsCn: [
      "没有任何方法能预测具体日期——时机是一种模式，不是日历事件。",
      "八字帮助你理解长期感情周期；奇门遁甲帮助当前决策；塔罗提供短期情感清晰度。",
      "更重要的问题往往不是\"什么时候\"，而是\"我在重复什么模式？\""
    ]
  },

  relatedQuestions: [
    { slug: "is-he-she-the-right-person", question: "Is He/She the Right Person?", questionCn: "他/她是对的人吗？" },
    { slug: "should-i-stay-or-leave", question: "Should I Stay or Leave?", questionCn: "我应该继续还是离开？" },
    { slug: "will-marriage-go-smoothly", question: "Will My Marriage Go Smoothly?", questionCn: "我的婚姻会顺利吗？" }
  ],

  // V2.0: CTA 更自然
  cta: {
    text: "If this article has helped you understand the overall direction, it has already served its purpose. If you would like to combine your birth information, current relationship status, or specific questions for a more personalized analysis, our consultants can provide guidance based on your unique situation.",
    textCn: "如果这篇文章已经帮助你理解了整体方向，那么它已经完成了它的使命。如果你希望结合自己的出生信息、当前感情状况或具体问题进行更个性化的分析，我们的咨询师可以根据你的独特情况提供指引。",
    buttonText: "Book a Relationship Consultation",
    buttonTextCn: "预约感情咨询",
    link: "/booking"
  },

  // V2.0: EEAT
  eeat: {
    reviewedBy: "Reviewed by StellaWei Editorial Team",
    reviewedByCn: "由 Stellawei 编辑团队审阅"
  },

  canonicalUrl: "https://stellawei.org/knowledge/relationship/when-will-i-meet-my-true-love",
  publishedAt: "2026-07-25",
  modifiedAt: "2026-07-25",
  author: "Stellawei Editorial Team"
};

// ==================== 文章索引 ====================

export const knowledgeArticles: Record<string, KnowledgeArticle> = {
  [whenWillIMeetMyTrueLove.slug]: whenWillIMeetMyTrueLove,
};

export function getArticleBySlug(slug: string): KnowledgeArticle | undefined {
  return knowledgeArticles[slug];
}

export function getArticlesByTopic(topicSlug: string): KnowledgeArticle[] {
  return Object.values(knowledgeArticles).filter(a => a.topicSlug === topicSlug);
}
