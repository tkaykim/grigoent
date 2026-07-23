import type { MetadataRoute } from "next";

const SITE = "https://grigoent.co.kr";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/artists`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/teams`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/history`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/archive`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/careers`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/intro`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/inquiries`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
