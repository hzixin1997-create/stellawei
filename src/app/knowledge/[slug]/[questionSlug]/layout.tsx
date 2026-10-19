import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/knowledge-articles";

interface Props {
  params: { slug: string; questionSlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticleBySlug(params.questionSlug);

  // 如果文章不存在或 topicSlug 不匹配，返回空 metadata（继承全局）
  if (!article || article.topicSlug !== params.slug) {
    return {};
  }

  return {
    title: article.metaTitle,
    description: article.metaDescription,
    alternates: {
      canonical: article.canonicalUrl,
    },
  };
}

export default function ArticleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
