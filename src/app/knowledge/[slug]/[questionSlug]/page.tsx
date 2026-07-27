import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { NavHeader } from "@/components/knowledge/NavHeader";
import { getTopicBySlug } from "@/lib/knowledge-data";

export const metadata: Metadata = {
  title: "我的正缘什么时候出现？| Stellawei 知识中心",
  description: "没有任何命理方法能准确预测具体日期。但东西方命理工具可以从不同维度帮助你理解正缘出现的可能性与方向。",
  alternates: {
    canonical: "https://stellawei.org/knowledge/relationship/when-will-i-meet-my-true-love",
  },
  openGraph: {
    title: "我的正缘什么时候出现？| Stellawei 知识中心",
    description: "没有任何命理方法能准确预测具体日期。但东西方命理工具可以从不同维度帮助你理解正缘出现的可能性与方向。",
    url: "https://stellawei.org/knowledge/relationship/when-will-i-meet-my-true-love",
    siteName: "Stellawei",
    locale: "zh_CN",
    type: "article",
    publishedTime: "2026-07-25",
    modifiedTime: "2026-07-27",
    authors: ["Stellawei Editorial Team"],
  },
  robots: "index, follow",
};

export default function KnowledgeArticlePage() {
  const topic = getTopicBySlug("relationship");

  if (!topic) {
    notFound();
  }

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Knowledge Center", href: "/knowledge" },
    { label: topic.nameCn || topic.name, href: `/knowledge/${topic.slug}` },
    { label: "我的正缘什么时候出现？" },
  ];

  // Article Schema
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "我的正缘什么时候出现？",
    description: "没有任何命理方法能准确预测具体日期。但东西方命理工具可以从不同维度帮助你理解正缘出现的可能性与方向。",
    url: "https://stellawei.org/knowledge/relationship/when-will-i-meet-my-true-love",
    datePublished: "2026-07-25",
    dateModified: "2026-07-27",
    author: { "@type": "Organization", name: "Stellawei Editorial Team" },
    publisher: {
      "@type": "Organization",
      name: "Stellawei",
      logo: { "@type": "ImageObject", url: "https://stellawei.org/logo.png" },
    },
  };

  // Breadcrumb Schema
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems
      .filter((item) => item.href || item.label)
      .map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.label,
        ...(item.href && { item: `https://stellawei.org${item.href}` }),
      })),
  };

  // FAQ Schema
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "八字能精确预测我哪年哪月遇到正缘吗？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "八字可以根据配偶星、配偶宫、大运与流年的相互作用，识别有利的时间窗口——通常可以精确到年份或季节。但它无法 pinpoint 具体日期。人生涉及自由意志、环境因素和无数变量。其价值在于理解时机模式并相应做好准备，而非获得具体日期。",
        },
      },
      {
        "@type": "Question",
        name: "塔罗能预测我什么时候遇到正缘吗？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "塔罗不适用于长期时机预测。它最有效的用途是理解你当下的情感状态、潜意识需求以及围绕你当前状况的能量。它可以揭示挑战、机遇以及针对即时感情决策的可执行指引。对于长期时机和结构性感情分析，八字或紫微斗数是更合适的工具。",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <NavHeader topic={topic} />

      <main className="pt-16">
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-white/40">
            {breadcrumbItems.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span>/</span>}
                {item.href ? (
                  <Link href={item.href} className="hover:text-white/60 transition-colors">
                    {item.label}
                  </Link>
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
              {topic.nameCn || topic.name}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white mb-4">
              我的正缘什么时候出现？
            </h1>
            <p className="text-lg text-white/60 max-w-2xl">
              许多人在分手、多年单身，或看着身边的朋友陆续恋爱、结婚后，开始问这些问题。东西方命理工具提供了不同的视角——东方方法侧重于出生时间规律与长期周期，而塔罗则反映你当下的情感状态与潜意识需求。
            </p>
          </div>
        </section>

        {/* 为什么问这个问题 */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-6">
              为什么很多人都会问这个问题？
            </h2>
            <div className="space-y-4">
              {[
                "想知道适合自己的另一半究竟何时会出现。",
                "为什么别人那么幸福，到了自己这里，总是这个不合适，那个有问题？",
                "为什么喜欢的人不喜欢你，喜欢你的你又不喜欢？",
                "为什么我总是遇到错的人？",
                "我已经很累了，坚持这段关系真的能看到希望吗？",
              ].map((q, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-stellawei-purple font-bold mt-0.5">{i + 1}.</span>
                  <p className="text-white/70">{q}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/5" />
        </div>

        {/* 东西方命理 */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-6">
              东西方命理如何帮助分析正缘？
            </h2>

            {/* 东方 */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-3">
                东方命理
              </h3>
              <p className="text-white/60 leading-relaxed">
                东方命理（以<strong className="text-white/80">八字、奇门遁甲、紫微斗数</strong>为核心）针对正缘问题，能基于阴阳五行、天干地支、星曜组合等规律，通过出生时间或时空坐标精准定位配偶星、配偶宫（夫妻宫），<strong className="text-white/80">描绘正缘的基本特征（外貌、性格、职业、背景）、判断正缘出现的大致年份 / 月份、评估婚姻稳定性与双方五行互补性</strong>，还可通过合婚分析看缘分深浅与长期相处潜力，整体偏向「定基调、看趋势」的长期预测，帮助人们把握命中注定的缘分时机与质量。
              </p>
            </div>

            {/* 西方 */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">
                西方命理
              </h3>
              <p className="text-white/60 leading-relaxed">
                西方命理（以<strong className="text-white/80">塔罗</strong>为主）则以象征心理学与集体潜意识为基础，通过牌面图像与直觉解读，<strong className="text-white/80">反映当下情感状态与潜意识需求、揭示关系中的挑战与机遇、提供改善关系的行动指引</strong>，更聚焦短期情感发展与个人成长，强调自由意志对关系走向的影响，帮助人们在情感困惑中看清内心、做出更契合的选择。
              </p>
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/5" />
        </div>

        {/* 具体方法 */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-6">
              具体方法
            </h2>

            {/* 八字 */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">
                一、八字命理：最主流的正缘分析方法
              </h3>
              <p className="text-white/60 leading-relaxed mb-4">
                八字（四柱命理）是东方命理中最基础、应用最广的正缘判断体系，咨询时通常会重点分析三个部分：
              </p>

              {/* 配偶星 */}
              <div className="bg-black/20 border border-white/5 rounded-xl p-5 mb-4">
                <h4 className="text-lg font-semibold text-white mb-3">
                  ① 配偶星
                </h4>
                <p className="text-white/60 mb-3">代表未来伴侣的大致特征。例如：</p>
                <ul className="space-y-2 text-white/60">
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>性格特点</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>职业倾向</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>相处模式</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>是否容易帮助自己成长</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>是否容易晚婚</span>
                  </li>
                </ul>
              </div>

              {/* 配偶宫 */}
              <div className="bg-black/20 border border-white/5 rounded-xl p-5 mb-4">
                <h4 className="text-lg font-semibold text-white mb-3">
                  ② 配偶宫（夫妻宫）
                </h4>
                <p className="text-white/60 mb-3">代表婚姻关系的发展情况。例如：</p>
                <ul className="space-y-2 text-white/60">
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>婚姻是否稳定</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>是否容易发生矛盾</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>双方相处模式</span>
                  </li>
                </ul>
              </div>

              {/* 大运流年 */}
              <div className="bg-black/20 border border-white/5 rounded-xl p-5 mb-4">
                <h4 className="text-lg font-semibold text-white mb-3">
                  ③ 大运与流年
                </h4>
                <p className="text-white/60 mb-3">八字通常会结合：</p>
                <ul className="space-y-2 text-white/60">
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>大运变化</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>流年变化</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-stellawei-purple mt-1">•</span>
                    <span>配偶星出现时间</span>
                  </li>
                </ul>
                <p className="text-white/60 mt-3">综合判断哪些年份更容易开始稳定关系。</p>
              </div>
            </div>

            {/* 奇门 */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">
                二、奇门遁甲：时空能量视角的正缘判断
              </h3>
              <p className="text-white/60 leading-relaxed mb-4">
                奇门遁甲以<strong className="text-white/80">时空模型</strong>（天干地支、九宫八卦、九星八门）为基础，擅长分析当下或特定时间点的缘分状态，适合判断「是否是正缘」「何时相遇」等具体问题。
              </p>
              <p className="text-white/60 mb-2">通常重点关注：</p>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-start gap-2">
                  <span className="text-stellawei-purple mt-1">•</span>
                  <span>对方是不是正缘</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-stellawei-purple mt-1">•</span>
                  <span>双方目前关系的发展趋势</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-stellawei-purple mt-1">•</span>
                  <span>什么时候主动更容易成功</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-stellawei-purple mt-1">•</span>
                  <span>当前最大的阻碍是什么</span>
                </li>
              </ul>
            </div>

            {/* 紫微 */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-4">
                三、紫微斗数：星象视角的正缘画像
              </h3>
              <p className="text-white/60 leading-relaxed mb-4">
                紫微斗数以<strong className="text-white/80">星曜组合</strong>为核心，通过命盘十二宫位分析正缘特征、缘分质量与出现时机，擅长描绘「关系结构」与「对方类型」。
              </p>
              <p className="text-white/60 mb-2">通常重点关注：</p>
              <ul className="space-y-2 text-white/60">
                <li className="flex items-start gap-2">
                  <span className="text-stellawei-purple mt-1">•</span>
                  <span>未来伴侣类型</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-stellawei-purple mt-1">•</span>
                  <span>婚姻模式</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-stellawei-purple mt-1">•</span>
                  <span>感情稳定度</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-stellawei-purple mt-1">•</span>
                  <span>是否容易晚婚</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-stellawei-purple mt-1">•</span>
                  <span>婚后相处模式</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/5" />
        </div>

        {/* 真实案例 */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-6">
              真实案例
            </h2>

            <div className="bg-black/30 border border-white/5 rounded-xl p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                八字精准断偏缘，助32岁女士避坑遇正缘
              </h3>

              <div className="space-y-4 text-white/60 text-sm leading-relaxed">
                <p>
                  <strong className="text-white/80">基本情况：</strong>李女士（1994年生，甲戌年），32岁，从事互联网运营，连续3年相亲无果，2024年秋结识一位属虎男士，对方热情体贴，她陷入纠结，不确定是否为正缘。
                </p>

                <p>
                  <strong className="text-white/80">八字分析：</strong>
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>命局：坤造甲戌、壬申、丙午、庚寅，<strong className="text-white/80">正官星（代表正缘）在年支戌土中藏而不显</strong>，且被月支申金伤官克制，显示晚婚趋势，早年易遇偏缘。</li>
                  <li>2024年流年甲辰，<strong className="text-white/80">甲木七杀透干</strong>（代表偏缘/不稳定关系），与命局形成「官杀混杂」，且男方属虎（寅木）与命局日支午火「寅午半合」，看似缘分深，实则暗藏隐患。</li>
                  <li>关键判断：男方八字显示已有家室，且与李女士<strong className="text-white/80">五行相克</strong>（木克土），长期相处易有矛盾。</li>
                </ol>

                <p>
                  <strong className="text-white/80">指导建议：</strong>
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>立即止损，彻底断联，避免消耗自身桃花运势。</li>
                  <li>正缘时间窗口：2025乙巳年（红鸾星动），尤其在农历3-5月（巳午未月，火土旺，助正官星显象）。</li>
                  <li>择偶方向：优先考虑<strong className="text-white/80">属马、属狗、属猪</strong>的男士（三合、六合，五行互补），职业以稳定型（公务员、教师、国企）为佳。</li>
                </ol>

                <p>
                  <strong className="text-white/80">实际结果：</strong>李女士听从建议，2025年4月在一次行业培训中结识一位属马的大学教师（符合择偶方向），两人相处融洽，同年10月订婚，2026年5月结婚，婚后生活稳定和谐。她特意带喜糖回访命理师，感慨「若不是及时止损，可能还在错误的关系里浪费时间」。
                </p>
              </div>
            </div>

            <p className="text-white/30 text-xs mt-4 text-center">
              案例已匿名化处理。结果因人而异，咨询旨在帮助理解问题，而非保证结果。
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/5" />
        </div>

        {/* 核心观点 */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-stellawei-purple/5 border border-stellawei-purple/20 rounded-2xl p-6 sm:p-8">
              <h2 className="text-2xl font-serif font-bold text-white mb-5">
                本文核心观点
              </h2>
              <p className="text-white/50 text-sm mb-5">如果只记住三件事：</p>
              <div className="space-y-4">
                {[
                  "东方八字、紫微、奇门依托阴阳五行、星象干支做长期推演，可预判正缘时间、对方特质、婚姻适配度。",
                  "西方塔罗基于潜意识象征解读，聚焦短期当下情感状态，提供心态与行动指引。",
                  "不同解决方式各有适用场景，通过适合的方法辅助客户做出情感选择。",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="text-stellawei-purple font-bold text-xl mt-0.5">{i + 1}</span>
                    <p className="text-white/80 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/5" />
        </div>

        {/* 相关问题 */}
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-6">
              相关问题
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { slug: "is-he-she-the-right-person", text: "他/她是对的人吗？" },
                { slug: "should-i-stay-or-leave", text: "我应该继续还是离开这段关系？" },
                { slug: "can-we-fix-this-relationship", text: "我们能修复这段关系吗？" },
              ].map((q) => (
                <Link
                  key={q.slug}
                  href={`/knowledge/relationship/${q.slug}`}
                  className="block p-4 bg-black/20 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                >
                  <p className="text-white/70 text-sm">{q.text}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-white/5" />
        </div>

        {/* CTA */}
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-white/60 mb-6 max-w-2xl mx-auto">
              每段关系都是独特的。如果你想要更个性化的分析，我们的咨询师可以根据你的具体情况提供指引。
            </p>
            <Link
              href="/booking"
              className="inline-flex items-center px-8 py-4 bg-stellawei-purple text-white font-medium rounded-xl hover:bg-stellawei-purple/90 transition-colors"
            >
              预约感情咨询
            </Link>
          </div>
        </section>

        {/* EEAT */}
        <section className="py-6 border-t border-white/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
              <span>由 Stellawei 编辑团队审阅</span>
              <span>发布于 2026-07-25</span>
              <span>更新于 2026-07-27</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/30 text-sm">
            © 2026 Stellawei. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
