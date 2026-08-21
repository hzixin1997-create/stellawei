import { masters } from "@/lib/data";
import { topicsData, questionsData } from "@/lib/knowledge-data";
import { knowledgeArticles } from "@/lib/knowledge-articles";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://stellawei.org";

  // Static routes — only SEO-relevant public pages
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/masters`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/services/tarot`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/services/bazi`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/services/spiritual`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/knowledge`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/refund-policy`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    },
  ];

  // Dynamic master detail pages
  const masterRoutes = masters.map((master) => ({
    url: `${baseUrl}/masters/${master.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Knowledge Center topic pages — auto-generated from topicsData
  const knowledgeTopicRoutes = Object.values(topicsData).map((topic) => ({
    url: `${baseUrl}/knowledge/${topic.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Knowledge Center article detail pages — auto-generated from knowledgeArticles
  // Only include articles that have actual content (exist in knowledgeArticles)
  const knowledgeArticleRoutes = Object.values(knowledgeArticles).map((article) => ({
    url: `${baseUrl}/knowledge/${article.topicSlug}/${article.slug}`,
    lastModified: new Date(article.modifiedAt || article.publishedAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...masterRoutes,
    ...knowledgeTopicRoutes,
    ...knowledgeArticleRoutes,
  ];
}
