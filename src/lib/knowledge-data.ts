// Knowledge Topics Data - Phase 1 (static)
// TODO: Replace with API call to Supabase after migration 040 is applied

export interface TopicData {
  slug: string;
  name: string;
  nameCn: string;
  description: string;
  descriptionCn: string;
  icon: string;
  intro: string;
  introCn: string;
}

export interface QuestionData {
  slug: string;
  question: string;
  questionCn: string;
  featured: boolean;
}

export const topicsData: Record<string, TopicData> = {
  relationship: {
    slug: "relationship",
    name: "Relationship",
    nameCn: "感情",
    description: "Love, compatibility, and emotional guidance",
    descriptionCn: "爱情、缘分与情感指引",
    icon: "heart",
    intro: "Relationship issues go beyond love—they involve life stages, values, and future planning. Explore common questions about true love, marriage, reconciliation, and long-term compatibility from an Eastern wisdom perspective.",
    introCn: "感情问题不仅涉及爱情，也关乎人生阶段、价值观与未来规划。这里整理了关于正缘、婚姻、复合、长期关系等常见问题，帮助用户从东方智慧角度获得更多思考方向。",
  },
  career: {
    slug: "career",
    name: "Career",
    nameCn: "事业",
    description: "Career decisions, promotions, and professional growth",
    descriptionCn: "职业选择、晋升与事业发展",
    icon: "briefcase",
    intro: "Career decisions shape your life trajectory. Whether considering a job change, promotion, or starting a business, understanding timing and personal strengths can help you navigate professional challenges with clarity.",
    introCn: "职业决定人生走向。无论是考虑换工作、晋升还是创业，了解时机和个人优势可以帮助你清晰地应对职业挑战。",
  },
  wealth: {
    slug: "wealth",
    name: "Wealth",
    nameCn: "财运",
    description: "Financial fortune, investment timing, and wealth growth",
    descriptionCn: "财富运势、投资时机与财运增长",
    icon: "coins",
    intro: "Wealth is not just about money—it's about understanding timing, opportunities, and your personal financial patterns. Discover insights on investment timing, income growth, and financial planning.",
    introCn: "财富不只是金钱，更是关于理解时机、机遇和个人财务格局。探索投资时机、收入增长和财务规划的洞察。",
  },
  "home-feng-shui": {
    slug: "home-feng-shui",
    name: "Home Feng Shui",
    nameCn: "家居风水",
    description: "Home energy, space arrangement, and environmental harmony",
    descriptionCn: "家居能量、空间布局与环境和谐",
    icon: "home",
    intro: "Your living space influences your energy and well-being. Learn how home layout, bed direction, workspace arrangement, and color choices can support your health, relationships, and success.",
    introCn: "居住空间影响你的能量和福祉。了解房屋布局、床位方向、工作空间布置和颜色选择如何支持你的健康、关系和成功。",
  },
  "life-direction": {
    slug: "life-direction",
    name: "Life Direction",
    nameCn: "人生方向",
    description: "Life path, destiny, and personal purpose",
    descriptionCn: "人生道路、命运与个人使命",
    icon: "compass",
    intro: "Feeling uncertain about your path? Life direction guidance helps you understand your purpose, evaluate major life decisions, and align your choices with your deeper calling and timing.",
    introCn: "对人生道路感到不确定？人生方向指引帮助你理解自己的使命、评估重大人生决定，并将选择与你的深层召唤和时机对齐。",
  },
  marriage: {
    slug: "marriage",
    name: "Marriage",
    nameCn: "婚姻",
    description: "Marriage timing, compatibility, and relationship stability",
    descriptionCn: "婚姻时机、配对与关系稳定",
    icon: "heart-handshake",
    intro: "Marriage is a major life decision that deserves careful consideration. Explore questions about timing, compatibility, relationship stability, and how to build a strong, lasting partnership.",
    introCn: "婚姻是重大人生决定，值得认真考虑。探索关于时机、配对、关系稳定性以及如何建立牢固持久伴侣关系的问题。",
  },
  "lost-items": {
    slug: "lost-items",
    name: "Lost Items",
    nameCn: "寻物",
    description: "Finding lost objects, recovery timing, and location clues",
    descriptionCn: "寻找失物、找回时机与位置线索",
    icon: "search",
    intro: "Losing something important can be stressful. Traditional methods can offer clues about where to look, recovery timing, and whether your item is still recoverable.",
    introCn: "丢失重要物品可能令人焦虑。传统方法可以提供关于寻找位置、找回时机以及物品是否还能找回的线索。",
  },
  "pet-health": {
    slug: "pet-health",
    name: "Pet Health",
    nameCn: "宠物健康",
    description: "Pet wellness, health predictions, and care guidance",
    descriptionCn: "宠物健康、健康预测与护理指引",
    icon: "dog",
    intro: "Your pet's well-being matters. Get insights into their health status, recovery outlook, behavioral concerns, and guidance on providing the best care for your furry companions.",
    introCn: "宠物的健康很重要。获取关于它们健康状况、康复前景、行为问题的洞察，以及如何为毛茸茸的伙伴提供最佳护理的指导。",
  },
  investment: {
    slug: "investment",
    name: "Investment",
    nameCn: "投资",
    description: "Investment timing, market trends, and financial decisions",
    descriptionCn: "投资时机、市场趋势与财务决策",
    icon: "trending-up",
    intro: "Investment decisions require timing and foresight. Explore guidance on market timing, suitable investment types for your profile, and strategies for wealth building and risk management.",
    introCn: "投资决策需要时机和远见。探索关于市场时机、适合你个人画像的投资类型以及财富积累和风险管理策略的指导。",
  },
};

export const questionsData: Record<string, QuestionData[]> = {
  relationship: [
    { slug: "when-will-i-meet-my-true-love", question: "When will I meet my true love?", questionCn: "我的正缘什么时候出现？", featured: true },
    { slug: "is-he-she-the-right-person", question: "Is he/she the right person for me?", questionCn: "他/她是对的人吗？", featured: true },
    { slug: "should-i-stay-or-leave", question: "Should I stay or leave this relationship?", questionCn: "我应该继续还是离开这段关系？", featured: true },
    { slug: "can-we-fix-our-relationship", question: "Can we fix our relationship?", questionCn: "我们能修复这段关系吗？", featured: true },
    { slug: "should-i-contact-my-ex", question: "Should I contact my ex?", questionCn: "我应该联系前任吗？", featured: false },
    { slug: "when-to-start-dating", question: "When is the best time to start dating?", questionCn: "什么时候开始新的恋情最好？", featured: false },
  ],
  career: [
    { slug: "should-i-change-career", question: "Should I change my career path?", questionCn: "我应该转行吗？", featured: true },
    { slug: "will-i-get-promotion", question: "Will I get a promotion this year?", questionCn: "今年我会升职吗？", featured: true },
    { slug: "right-time-to-start-business", question: "Is this the right time to start a business?", questionCn: "现在是创业的好时机吗？", featured: true },
    { slug: "how-to-advance-current-role", question: "How can I advance in my current role?", questionCn: "如何在现有职位上晋升？", featured: true },
    { slug: "should-i-accept-job-offer", question: "Should I accept this job offer?", questionCn: "我应该接受这份工作吗？", featured: false },
    { slug: "what-career-suits-me", question: "What career suits me best?", questionCn: "什么职业最适合我？", featured: false },
  ],
  wealth: [
    { slug: "wealth-fortune-trend", question: "How is my wealth fortune trending?", questionCn: "我的财运走势如何？", featured: true },
    { slug: "when-will-finances-improve", question: "When will my financial situation improve?", questionCn: "我的财务状况何时会好转？", featured: true },
    { slug: "should-i-make-major-purchase", question: "Should I make a major purchase now?", questionCn: "我现在应该进行大额消费吗？", featured: true },
    { slug: "how-to-increase-income", question: "How can I increase my income?", questionCn: "如何增加我的收入？", featured: true },
    { slug: "save-or-invest", question: "Is this a good time to save or invest?", questionCn: "现在是储蓄还是投资的好时机？", featured: false },
    { slug: "unexpected-expenses", question: "Will I have unexpected expenses?", questionCn: "我会有意外开支吗？", featured: false },
  ],
  "home-feng-shui": [
    { slug: "adjust-home-feng-shui", question: "How to adjust home feng shui for better luck?", questionCn: "家里风水摆设如何调整提升运势？", featured: true },
    { slug: "bed-direction", question: "Which direction should my bed face?", questionCn: "我的床应该朝哪个方向？", featured: true },
    { slug: "home-layout-energy", question: "Is my home layout affecting my energy?", questionCn: "我的房屋布局影响我的能量吗？", featured: true },
    { slug: "workspace-arrangement", question: "How to arrange my workspace for success?", questionCn: "如何布置我的工作空间以利事业？", featured: true },
    { slug: "home-colors", question: "What colors should I use in my home?", questionCn: "我家应该用什么颜色？", featured: false },
    { slug: "negative-energy-home", question: "Is there negative energy in my home?", questionCn: "我家里有负能量吗？", featured: false },
  ],
  "life-direction": [
    { slug: "am-i-on-right-path", question: "Am I on the right life path?", questionCn: "我走在正确的人生道路上吗？", featured: true },
    { slug: "what-is-my-life-purpose", question: "What is my life purpose?", questionCn: "我的人生使命是什么？", featured: true },
    { slug: "should-i-move-city", question: "Should I move to a new city?", questionCn: "我应该搬到新城市吗？", featured: true },
    { slug: "next-decade-trajectory", question: "What is my life trajectory for the next decade?", questionCn: "我未来十年的人生走势如何？", featured: true },
    { slug: "find-true-calling", question: "How can I find my true calling?", questionCn: "如何找到我的真正使命？", featured: false },
    { slug: "right-life-decisions", question: "Am I making the right life decisions?", questionCn: "我在做正确的人生决定吗？", featured: false },
  ],
  marriage: [
    { slug: "will-marriage-go-smoothly", question: "Will my marriage go smoothly?", questionCn: "我的婚姻会顺利吗？", featured: true },
    { slug: "best-time-to-marry", question: "When is the best time to get married?", questionCn: "什么时候结婚最好？", featured: true },
    { slug: "are-we-compatible-marriage", question: "Are we compatible for marriage?", questionCn: "我们适合结婚吗？", featured: true },
    { slug: "how-to-improve-marriage", question: "How can I improve my marriage?", questionCn: "如何改善我的婚姻？", featured: true },
    { slug: "happy-marriage", question: "Will I have a happy marriage?", questionCn: "我会拥有幸福的婚姻吗？", featured: false },
    { slug: "marry-now-or-wait", question: "Should I get married now or wait?", questionCn: "我现在应该结婚还是等待？", featured: false },
  ],
  "lost-items": [
    { slug: "can-i-find-lost-items", question: "Can I find my lost items?", questionCn: "我丢失的物品能找到吗？", featured: true },
    { slug: "where-to-look-lost-item", question: "Where should I look for my lost item?", questionCn: "我应该在哪里寻找丢失的物品？", featured: true },
    { slug: "will-lost-item-be-returned", question: "Will my lost item be returned?", questionCn: "我丢失的物品会被归还吗？", featured: true },
    { slug: "when-find-lost-item", question: "When will I find my lost item?", questionCn: "我什么时候能找到丢失的物品？", featured: true },
    { slug: "is-lost-item-recoverable", question: "Is my lost item still recoverable?", questionCn: "我丢失的物品还能找回吗？", featured: false },
    { slug: "who-took-lost-item", question: "Who took my lost item?", questionCn: "谁拿了我的丢失物品？", featured: false },
  ],
  "pet-health": [
    { slug: "how-is-my-pets-health", question: "How is my pet's health?", questionCn: "我的宠物健康状况如何？", featured: true },
    { slug: "will-pet-recover", question: "Will my pet recover from illness?", questionCn: "我的宠物会从疾病中康复吗？", featured: true },
    { slug: "worried-about-pet-behavior", question: "Should I be worried about my pet's behavior?", questionCn: "我应该担心宠物的行为吗？", featured: true },
    { slug: "best-time-new-pet", question: "When is the best time to get a new pet?", questionCn: "什么时候养新宠物最好？", featured: true },
    { slug: "improve-pet-wellbeing", question: "How can I improve my pet's wellbeing?", questionCn: "如何改善宠物的健康状况？", featured: false },
    { slug: "will-pet-live-long", question: "Will my pet live a long life?", questionCn: "我的宠物会长寿吗？", featured: false },
  ],
  investment: [
    { slug: "good-time-to-invest", question: "Is this a good time to invest?", questionCn: "现在是投资的好时机吗？", featured: true },
    { slug: "investment-suits-fortune", question: "What investment suits my fortune?", questionCn: "什么投资适合我的财运？", featured: true },
    { slug: "invest-in-property", question: "Should I invest in property now?", questionCn: "我现在应该投资房产吗？", featured: true },
    { slug: "will-investment-profit", question: "Will my investment be profitable?", questionCn: "我的投资会有收益吗？", featured: true },
    { slug: "stocks-or-real-estate", question: "Should I invest in stocks or real estate?", questionCn: "我应该投资股票还是房地产？", featured: false },
    { slug: "when-see-returns", question: "When will I see returns on my investment?", questionCn: "我什么时候能看到投资回报？", featured: false },
  ],
};

export function getTopicBySlug(slug: string): TopicData | undefined {
  return topicsData[slug];
}

export function getQuestionsByTopic(slug: string): QuestionData[] {
  return questionsData[slug] || [];
}

export function getAllTopics(): TopicData[] {
  return Object.values(topicsData);
}
