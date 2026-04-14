import { NextSeo } from "next-seo";

export default function SEO() {
  return (
    <NextSeo
      title="그리고 엔터테인먼트 – 회사 소개"
      description="댄서 전문 엔터테인먼트 – 매니지먼트 · 공연기획 · 미디어콘텐츠 · 광고"
      openGraph={{
        title: "그리고 엔터테인먼트 – 회사 소개",
        description:
          "댄서 전문 엔터테인먼트 – 매니지먼트 · 공연기획 · 미디어콘텐츠 · 광고",
        images: [
          { url: "/og/intro.png", width: 1200, height: 630, alt: "GRIGO" },
        ],
      }}
    />
  );
}

