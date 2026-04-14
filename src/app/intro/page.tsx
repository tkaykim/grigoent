import Hero from "@/components/intro/Hero";
import ArtistsCarousel from "@/components/intro/ArtistsCarousel";
import { VideoCard } from "@/components/intro/VideoCard";
import Timeline from "@/components/intro/Timeline";
import GalleryLightbox from "@/components/intro/GalleryLightbox";
import SmoothScroll from "@/components/intro/SmoothScroll";
import IntroClient from "./IntroClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "그리고 엔터테인먼트 – 회사 소개",
  description:
    "댄서 전문 엔터테인먼트 – 매니지먼트 · 공연기획 · 미디어콘텐츠 · 광고",
  openGraph: {
    title: "그리고 엔터테인먼트 – 회사 소개",
    description:
      "댄서 전문 엔터테인먼트 – 매니지먼트 · 공연기획 · 미디어콘텐츠 · 광고",
    images: [{ url: "/og/intro.png", width: 1200, height: 630, alt: "GRIGO" }],
    type: "website",
    url: "/intro",
  },
};

const timeline = [
  { year: "2020", items: ["유튜브 콘텐츠 제작사 설립 및 댄서 리안 영입", "댄서 JAYB와 팀 라치카 영입"] },
  { year: "2021", items: ["스트릿 우먼 파이터, 걸스파이터 라치카 출연"] },
  { year: "2022", items: ["댄스행사 기업 플로우메이커 인수합병"] },
  { year: "2023~2024", items: ["유튜브 예능 대세같이주, 디바마을 킨가비 기획/제작"] },
  { year: "2024~2025", items: ["힙합댄스팀/안무가 영입, 팬미팅/행사 기획 및 분사"] },
];

export default function Page() {
  return <IntroClient />;
}

