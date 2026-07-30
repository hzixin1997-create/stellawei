'use client';

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { NavHeader } from "@/components/knowledge/NavHeader";
import { getTopicBySlug } from "@/lib/knowledge-data";

interface Props {
  params: { slug: string; questionSlug: string };
}

// JSON-LD structured data (static, language-agnostic)
const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "When Will I Meet My Soulmate? | 我的正缘什么时候出现？",
  description: "No divination method can predict the exact date. Eastern and Western tools offer different lenses to understand relationship timing.",
  url: "https://stellawei.org/knowledge/relationship/when-will-i-meet-my-soulmate",
  datePublished: "2026-07-25",
  dateModified: "2026-07-27",
  author: { "@type": "Organization", name: "Stellawei Editorial Team" },
  publisher: {
    "@type": "Organization",
    name: "Stellawei",
    logo: { "@type": "ImageObject", url: "https://stellawei.org/logo.png" },
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://stellawei.org/" },
    { "@type": "ListItem", position: 2, name: "Knowledge Center", item: "https://stellawei.org/knowledge" },
    { "@type": "ListItem", position: 3, name: "Relationship", item: "https://stellawei.org/knowledge/relationship" },
    { "@type": "ListItem", position: 4, name: "When Will I Meet My Soulmate?" },
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can BaZi predict the exact year and month I will meet my soulmate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "BaZi can identify favorable time windows—often down to the year or season—based on the interplay of your Spouse Star, Spouse Palace, Major Luck cycles, and Annual Cycles. However, it cannot pinpoint an exact date. Life involves free will, environmental factors, and countless variables.",
      },
    },
    {
      "@type": "Question",
      name: "Can Tarot predict when I will meet my soulmate?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tarot is not designed for long-term timing predictions. It is most effective for understanding your current emotional state, subconscious needs, and the energies surrounding your present situation.",
      },
    },
  ],
};

export default function KnowledgeArticlePage({ params }: Props) {
  const { slug, questionSlug } = params;
  const { i18n } = useTranslation();
  const isZh = i18n.language === "zh";
  const topic = getTopicBySlug("relationship")!;

  // Breadcrumb items
  const breadcrumbItems = [
    { label: isZh ? "首页" : "Home", href: "/" },
    { label: isZh ? "知识中心" : "Knowledge Center", href: "/knowledge" },
    { label: isZh ? topic?.nameCn : topic?.name, href: `/knowledge/${topic?.slug}` },
    { label: isZh ? "我的正缘什么时候出现？" : "When Will I Meet My Soulmate?" },
  ];

  // Content (bilingual)
  const content = {
    hero: {
      title: isZh ? "我的正缘什么时候出现？" : "When Will I Meet My Soulmate?",
      intro: isZh
        ? "许多人在分手、多年单身，或看着身边的朋友陆续恋爱、结婚后，开始问这些问题。东西方命理工具提供了不同的视角——东方方法侧重于出生时间规律与长期周期，而塔罗则反映你当下的情感状态与潜意识需求。"
        : "Many people begin asking this question after a breakup, years of being single, or watching friends around them fall in love and get married. Eastern and Western divination tools offer different perspectives—Eastern methods focus on birth-time patterns and long-term cycles, while Tarot reflects your current emotional state and subconscious needs.",
    },
    whyAsk: {
      heading: isZh ? "为什么很多人都会问这个问题？" : "Why Do So Many People Ask This Question?",
      questions: isZh
        ? [
            "想知道适合自己的另一半究竟何时会出现。",
            "为什么别人那么幸福，到了自己这里，总是这个不合适，那个有问题？",
            "为什么喜欢的人不喜欢你，喜欢你的你又不喜欢？",
            "为什么我总是遇到错的人？",
            "我已经很累了，坚持这段关系真的能看到希望吗？",
          ]
        : [
            "I want to know when the right person for me will actually appear.",
            "Why does everyone else seem happy while I keep meeting the wrong people?",
            "Why do the people I like not like me back, and those who like me are not my type?",
            "Why do I always end up with the wrong person?",
            "I am exhausted—does persisting in this relationship really have hope?",
          ],
    },
    eastWest: {
      heading: isZh ? "东西方命理如何帮助分析正缘？" : "How Eastern and Western Divination Help Analyze Soulmate",
      easternTitle: isZh ? "东方命理" : "Eastern Divination",
      easternDesc: isZh
        ? "东方命理（以八字、奇门遁甲、紫微斗数为核心）针对正缘问题，能基于阴阳五行、天干地支、星曜组合等规律，通过出生时间或时空坐标精准定位配偶星、配偶宫（夫妻宫），描绘正缘的基本特征（外貌、性格、职业、背景）、判断正缘出现的大致年份/月份、评估婚姻稳定性与双方五行互补性，还可通过合婚分析看缘分深浅与长期相处潜力，整体偏向「定基调、看趋势」的长期预测，帮助人们把握命中注定的缘分时机与质量。"
        : "Eastern divination (BaZi, Qi Men Dun Jia, Zi Wei Dou Shu) analyzes soulmate questions through the principles of Yin-Yang, Five Elements, Heavenly Stems and Earthly Branches, and star combinations. By using birth time or spacetime coordinates, it precisely locates the Spouse Star and Spouse Palace, outlines your partner's basic traits (appearance, personality, career, background), estimates the approximate year/month of their appearance, assesses marriage stability and elemental compatibility, and evaluates the depth of connection and long-term potential through marriage-matching analysis. Overall, it leans toward long-term forecasting that sets the tone and identifies trends, helping people grasp the timing and quality of fated relationships.",
      westernTitle: isZh ? "西方命理" : "Western Divination",
      westernDesc: isZh
        ? "西方命理（以塔罗为主）则以象征心理学与集体潜意识为基础，通过牌面图像与直觉解读，反映当下情感状态与潜意识需求、揭示关系中的挑战与机遇、提供改善关系的行动指引，更聚焦短期情感发展与个人成长，强调自由意志对关系走向的影响，帮助人们在情感困惑中看清内心、做出更契合的选择。"
        : "Western divination (primarily Tarot) is based on symbolic psychology and the collective unconscious. Through card imagery and intuitive interpretation, it reflects your present emotional state and subconscious needs, reveals challenges and opportunities in relationships, and offers actionable guidance for improvement. It focuses more on short-term emotional development and personal growth, emphasizing how free will influences relationship outcomes, helping people see clearly within emotional confusion and make choices that better align with their true selves.",
    },
    methods: {
      heading: isZh ? "具体方法" : "Specific Methods",
      bazi: {
        title: isZh ? "一、八字命理：最主流的正缘分析方法" : "1. BaZi (Four Pillars): The Most Mainstream Soulmate Analysis Method",
        intro: isZh
          ? "八字（四柱命理）是东方命理中最基础、应用最广的正缘判断体系，咨询时通常会重点分析三个部分："
          : "BaZi (Four Pillars) is the most fundamental and widely applied system in Eastern divination for soulmate assessment. A consultation typically focuses on three key areas:",
        spouseStar: {
          title: isZh ? "① 配偶星" : "① Spouse Star",
          desc: isZh ? "代表未来伴侣的大致特征。例如：" : "Represents the general characteristics of your future partner. For example:",
          items: isZh
            ? ["性格特点", "职业倾向", "相处模式", "是否容易帮助自己成长", "是否容易晚婚"]
            : ["Personality traits", "Career tendencies", "Interaction patterns", "Whether they help you grow", "Likelihood of late marriage"],
        },
        spousePalace: {
          title: isZh ? "② 配偶宫（夫妻宫）" : "② Spouse Palace (Marriage Palace)",
          desc: isZh ? "代表婚姻关系的发展情况。例如：" : "Represents the development of the marital relationship. For example:",
          items: isZh
            ? ["婚姻是否稳定", "是否容易发生矛盾", "双方相处模式"]
            : ["Marriage stability", "Likelihood of conflicts", "Interaction patterns between partners"],
        },
        luckCycles: {
          title: isZh ? "③ 大运与流年" : "③ Major Luck & Annual Cycles",
          desc: isZh ? "八字通常会结合：" : "BaZi typically combines:",
          items: isZh ? ["大运变化", "流年变化", "配偶星出现时间"] : ["Major Luck cycle changes", "Annual cycle changes", "Timing of Spouse Star appearance"],
          conclusion: isZh
            ? "综合判断哪些年份更容易开始稳定关系。"
            : "To comprehensively determine which years are more favorable for beginning a stable relationship.",
        },
      },
      qimen: {
        title: isZh ? "二、奇门遁甲：时空能量视角的正缘判断" : "2. Qi Men Dun Jia: Spacetime Energy Perspective on Soulmate",
        desc: isZh
          ? "奇门遁甲以时空模型（天干地支、九宫八卦、九星八门）为基础，擅长分析当下或特定时间点的缘分状态，适合判断「是否是正缘」「何时相遇」等具体问题。"
          : "Qi Men Dun Jia uses a spacetime model (Heavenly Stems, Earthly Branches, Nine Palaces, Eight Trigrams, Nine Stars, Eight Doors) as its foundation. It excels at analyzing the energy state of a relationship at a specific moment, making it suitable for concrete questions like 'Is this my soulmate?' or 'When will we meet?'",
        focus: isZh ? "通常重点关注：" : "Key areas of focus:",
        items: isZh
          ? ["对方是不是正缘", "双方目前关系的发展趋势", "什么时候主动更容易成功", "当前最大的阻碍是什么"]
          : ["Is this person my soulmate?", "Current relationship development trends", "When is the best time to take initiative?", "What is the biggest obstacle right now?"],
      },
      ziwei: {
        title: isZh ? "三、紫微斗数：星象视角的正缘画像" : "3. Zi Wei Dou Shu: Astrological Portrait of Soulmate",
        desc: isZh
          ? "紫微斗数以星曜组合为核心，通过命盘十二宫位分析正缘特征、缘分质量与出现时机，擅长描绘「关系结构」与「对方类型」。"
          : "Zi Wei Dou Shu uses star combinations as its core, analyzing soulmate characteristics, relationship quality, and timing through the twelve palaces of the birth chart. It excels at depicting 'relationship structure' and 'partner types.'",
        focus: isZh ? "通常重点关注：" : "Key areas of focus:",
        items: isZh
          ? ["未来伴侣类型", "婚姻模式", "感情稳定度", "是否容易晚婚", "婚后相处模式"]
          : ["Future partner type", "Marriage patterns", "Emotional stability", "Likelihood of late marriage", "Post-marriage interaction style"],
      },
    },
    caseStudy: {
      heading: isZh ? "真实案例" : "Real Case Study",
      title: isZh ? "八字精准断偏缘，助32岁女士避坑遇正缘" : "BaZi Accurately Identifies a Non-Soulmate Relationship, Helping a 32-Year-Old Woman Avoid Pitfalls and Find Soulmate",
      sections: isZh
        ? [
            { label: "基本情况", text: "李女士（1994年生，甲戌年），32岁，从事互联网运营，连续3年相亲无果，2024年秋结识一位属虎男士，对方热情体贴，她陷入纠结，不确定是否为正缘。" },
            { label: "八字分析", text: "1. 命局：坤造甲戌、壬申、丙午、庚寅，正官星（代表正缘）在年支戌土中藏而不显，且被月支申金伤官克制，显示晚婚趋势，早年易遇偏缘。2. 2024年流年甲辰，甲木七杀透干（代表偏缘/不稳定关系），与命局形成「官杀混杂」，且男方属虎（寅木）与命局日支午火「寅午半合」，看似缘分深，实则暗藏隐患。3. 关键判断：男方八字显示已有家室，且与李女士五行相克（木克土），长期相处易有矛盾。" },
            { label: "指导建议", text: "1. 立即止损，彻底断联，避免消耗自身桃花运势。2. 正缘时间窗口：2025乙巳年（红鸾星动），尤其在农历3-5月（巳午未月，火土旺，助正官星显象）。3. 择偶方向：优先考虑属马、属狗、属猪的男士（三合、六合，五行互补），职业以稳定型（公务员、教师、国企）为佳。" },
            { label: "实际结果", text: "李女士听从建议，2025年4月在一次行业培训中结识一位属马的大学教师（符合择偶方向），两人相处融洽，同年10月订婚，2026年5月结婚，婚后生活稳定和谐。她特意带喜糖回访命理师，感慨「若不是及时止损，可能还在错误的关系里浪费时间」。" },
          ]
        : [
            { label: "Background", text: "Ms. Li (born 1994, Jia-Xu year), age 32, worked in internet operations. After three years of unsuccessful dating, she met a warm and attentive Tiger zodiac man in autumn 2024 and fell into indecision, unsure if he was her soulmate." },
            { label: "BaZi Analysis", text: "1. Her chart: Kun (female) Jia-Xu, Ren-Shen, Bing-Wu, Geng-Yin. The Official Star (representing soulmate) was hidden in the Year Branch Xu earth and suppressed by the Month Branch Shen metal, indicating a late-marriage tendency and early encounters with non-soulmate relationships. 2. The 2024 Annual Cycle Jia-Chen brought the Seven Killings (unstable relationships) to the surface, creating a 'mixed Officials and Killings' pattern. The man's Tiger zodiac formed a 'Yin-Wu semi-combination' with her Day Branch, suggesting apparent connection but hidden risks. 3. Key insight: the man's chart indicated he was already married, and their Five Elements were incompatible (Wood overcoming Earth), making long-term conflict likely." },
            { label: "Guidance", text: "1. Stop immediately and cut all contact to avoid draining her own romantic energy. 2. Soulmate window: 2025 Yi-Si year (Red Phoenix Star activation), especially lunar months 3-5 (fire-earth elements strengthen the Official Star). 3. Partner direction: prioritize Horse, Dog, or Pig zodiac men (harmonious combinations with complementary elements), preferably with stable careers (civil servants, teachers, state-owned enterprises)." },
            { label: "Outcome", text: "Following the advice, Ms. Li met a Horse zodiac university teacher in April 2025 at an industry training (matching the guidance). They got along well, got engaged in October 2025, and married in May 2026. She brought wedding candy back to the consultant, saying 'Without stopping in time, I might still be wasting time in the wrong relationship.'" },
          ],
      disclaimer: isZh
        ? "案例已匿名化处理。结果因人而异，咨询旨在帮助理解问题，而非保证结果。"
        : "Case is anonymized. Results vary by individual. Consultations aim to help you understand your situation, not guarantee outcomes.",
    },
    keyTakeaways: {
      heading: isZh ? "本文核心观点" : "Key Takeaways",
      items: isZh
        ? [
            "东方八字、紫微、奇门依托阴阳五行、星象干支做长期推演，可预判正缘时间、对方特质、婚姻适配度。",
            "西方塔罗基于潜意识象征解读，聚焦短期当下情感状态，提供心态与行动指引。",
            "不同解决方式各有适用场景，通过适合的方法辅助客户做出情感选择。",
          ]
        : [
            "Eastern systems (BaZi, Zi Wei, Qi Men) rely on Yin-Yang, Five Elements, and celestial patterns for long-term forecasting of relationship timing, partner traits, and marriage compatibility.",
            "Western Tarot interprets subconscious symbolism to illuminate your current emotional state and provide mindset and action guidance.",
            "Different methods serve different purposes; the right tool depends on whether you need structural insight, current clarity, or both.",
          ],
    },
    related: {
      heading: isZh ? "相关问题" : "Related Questions",
      items: [
        { slug: "is-he-she-the-right-person", text: isZh ? "他/她是对的人吗？" : "Is He/She the Right Person?" },
        { slug: "should-i-stay-or-leave", text: isZh ? "我应该继续还是离开这段关系？" : "Should I Stay or Leave This Relationship?" },
        { slug: "can-we-fix-this-relationship", text: isZh ? "我们能修复这段关系吗？" : "Can We Fix This Relationship?" },
      ],
    },
    cta: {
      textLine1: isZh
        ? "每段关系都是独特的。"
        : "Every relationship is unique.",
      textLine2: isZh
        ? "如果你想要更个性化的分析，我们的咨询师可以根据你的具体情况提供指引。"
        : "If you would like a more personalized analysis, our consultants can provide guidance tailored to your situation.",
      button: isZh ? "预约感情咨询" : "Book a Relationship Consultation",
    },
    eeat: {
      reviewedBy: isZh ? "由 Stellawei 编辑团队审阅" : "Reviewed by StellaWei Editorial Team",
      published: isZh ? "发布于" : "Published",
      updated: isZh ? "更新于" : "Updated",
    },
  };

  const c = content;

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <NavHeader topic={topic} />

      <main className="pt-16">
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-white/40">
            {breadcrumbItems.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                {item.href ? (
                  <Link href={item.href} className="hover:text-white/60 transition-colors">{item.label}</Link>
                ) : (
                  <span className="text-white/60">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Hero */}
        <section className="py-8 sm:py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="inline-block px-3 py-1 rounded-full bg-stellawei-purple/10 text-stellawei-purple text-sm mb-4">
              {isZh ? topic?.nameCn : topic?.name}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">
              {c.hero.title}
            </h1>
            <p className="text-lg text-white/60 max-w-2xl">{c.hero.intro}</p>
          </div>
        </section>

        {/* Why People Ask */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">{c.whyAsk.heading}</h2>
          <div className="space-y-4">
            {c.whyAsk.questions.map((q, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-stellawei-purple font-bold mt-0.5">{i + 1}.</span>
                <p className="text-white/70">{q}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Eastern & Western */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">{c.eastWest.heading}</h2>
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-3">{c.eastWest.easternTitle}</h3>
            <p className="text-white/60 leading-relaxed" dangerouslySetInnerHTML={{
              __html: c.eastWest.easternDesc
                .replace(/八字、奇门遁甲、紫微斗数/g, '<strong class="text-white/80">八字、奇门遁甲、紫微斗数</strong>')
                .replace(/BaZi, Qi Men Dun Jia, Zi Wei Dou Shu/g, '<strong class="text-white/80">BaZi, Qi Men Dun Jia, Zi Wei Dou Shu</strong>')
            }} />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white mb-3">{c.eastWest.westernTitle}</h3>
            <p className="text-white/60 leading-relaxed" dangerouslySetInnerHTML={{
              __html: c.eastWest.westernDesc
                .replace(/塔罗/g, '<strong class="text-white/80">塔罗</strong>')
                .replace(/Tarot/g, '<strong class="text-white/80">Tarot</strong>')
            }} />
          </div>
        </Section>

        {/* Methods */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">{c.methods.heading}</h2>

          {/* BaZi */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">{c.methods.bazi.title}</h3>
            <p className="text-white/60 leading-relaxed mb-4">{c.methods.bazi.intro}</p>

            <Card title={c.methods.bazi.spouseStar.title}>
              <p className="text-white/60 mb-3">{c.methods.bazi.spouseStar.desc}</p>
              <BulletList items={c.methods.bazi.spouseStar.items} />
            </Card>

            <Card title={c.methods.bazi.spousePalace.title}>
              <p className="text-white/60 mb-3">{c.methods.bazi.spousePalace.desc}</p>
              <BulletList items={c.methods.bazi.spousePalace.items} />
            </Card>

            <Card title={c.methods.bazi.luckCycles.title}>
              <p className="text-white/60 mb-3">{c.methods.bazi.luckCycles.desc}</p>
              <BulletList items={c.methods.bazi.luckCycles.items} />
              <p className="text-white/60 mt-3">{c.methods.bazi.luckCycles.conclusion}</p>
            </Card>
          </div>

          {/* Qi Men */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">{c.methods.qimen.title}</h3>
            <p className="text-white/60 leading-relaxed mb-4" dangerouslySetInnerHTML={{
              __html: c.methods.qimen.desc.replace(/时空模型/g, '<strong class="text-white/80">时空模型</strong>').replace(/spacetime model/g, '<strong class="text-white/80">spacetime model</strong>')
            }} />
            <p className="text-white/60 mb-2">{c.methods.qimen.focus}</p>
            <BulletList items={c.methods.qimen.items} />
          </div>

          {/* Zi Wei */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">{c.methods.ziwei.title}</h3>
            <p className="text-white/60 leading-relaxed mb-4" dangerouslySetInnerHTML={{
              __html: c.methods.ziwei.desc.replace(/星曜组合/g, '<strong class="text-white/80">星曜组合</strong>').replace(/star combinations/g, '<strong class="text-white/80">star combinations</strong>')
            }} />
            <p className="text-white/60 mb-2">{c.methods.ziwei.focus}</p>
            <BulletList items={c.methods.ziwei.items} />
          </div>
        </Section>

        {/* Case Study */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">{c.caseStudy.heading}</h2>
          <div className="bg-black/30 border border-white/5 rounded-xl p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-white mb-4">{c.caseStudy.title}</h3>
            <div className="space-y-4 text-white/60 text-sm leading-relaxed">
              {c.caseStudy.sections.map((s, i) => (
                <div key={i}>
                  <p><strong className="text-white/80">{s.label}：</strong>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/30 text-xs mt-4 text-center">{c.caseStudy.disclaimer}</p>
        </Section>

        {/* Key Takeaways */}
        <Section>
          <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-2xl p-6 sm:p-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-5">{c.keyTakeaways.heading}</h2>
            <div className="space-y-4">
              {c.keyTakeaways.items.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="text-stellawei-purple font-bold text-xl mt-0.5">{i + 1}</span>
                  <p className="text-white/80 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Related Questions */}
        <Section>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">{c.related.heading}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {c.related.items.map((q) => (
              <Link key={q.slug} href={`/knowledge/relationship/${q.slug}`} className="block p-4 bg-black/20 border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                <p className="text-white/70 text-sm">{q.text}</p>
              </Link>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-white/60 mb-2 max-w-2xl mx-auto">{c.cta.textLine1}</p>
            <p className="text-white/60 mb-6 max-w-2xl mx-auto">{c.cta.textLine2}</p>
            <Link href="/booking" className="inline-flex items-center px-8 py-4 bg-stellawei-purple text-white font-medium rounded-xl hover:bg-stellawei-purple/90 transition-colors">
              {c.cta.button}
            </Link>
          </div>
        </section>

        {/* EEAT */}
        <section className="py-6 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
              <span>{c.eeat.reviewedBy}</span>
              <span>{c.eeat.published} 2026-07-25</span>
              <span>{c.eeat.updated} 2026-07-27</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/30 text-sm">© 2026 Stellawei. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Layout helpers
function Section({ children }: { children: React.ReactNode }) {
  return (
    <>
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </section>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-white/5" />
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-black/20 border border-white/5 rounded-xl p-5 mb-4">
      <h4 className="text-lg font-semibold text-white mb-3">{title}</h4>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-white/60">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-stellawei-purple mt-1">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
