"use client";
import TitleSection from "@/components/intro/TitleSection";
import CompanyTable from "@/components/intro/CompanyTable";
import Hero from "@/components/intro/Hero";
import Divisions from "@/components/intro/Divisions";
import ArtistsCarousel from "@/components/intro/ArtistsCarousel";
import { VideoCard } from "@/components/intro/VideoCard";
import Timeline from "@/components/intro/Timeline";
import GalleryLightbox from "@/components/intro/GalleryLightbox";
import SmoothScroll from "@/components/intro/SmoothScroll";
import UploadImageBox from "@/components/intro/UploadImageBox";
import { useIntroContent } from "@/components/intro/useIntroContent";

export default function IntroClient() {
  const { content } = useIntroContent();

  const timeline = [
    { year: "2020", items: ["유튜브 콘텐츠 제작사 설립 및 댄서 리안 영입", "댄서 JAYB와 팀 라치카 영입"] },
    { year: "2021", items: ["스트릿 우먼 파이터, 걸스파이터 라치카 출연"] },
    { year: "2022", items: ["댄스행사 기업 플로우메이커 인수합병"] },
    { year: "2023~2024", items: ["유튜브 예능 대세같이주, 디바마을 킨가비 기획/제작"] },
    { year: "2024~2025", items: ["힙합댄스팀/안무가 영입, 팬미팅/행사 기획 및 분사"] },
  ];

  return (
    <main className="container mx-auto px-4">
      <SmoothScroll />
      {/* 슬라이드1: 타이틀 */}
      <TitleSection />

      {/* 슬라이드2: 회사 정보 테이블(임시 값) */}
      <CompanyTable
        rows={[
          { key: "회사명", value: "(주)그리고 엔터테인먼트" },
          { key: "대표이사", value: "김현준" },
          { key: "설립연도", value: "2020.08.01" },
          { key: "주요사업", value: "댄서와 안무가들의 댄서 전문 매니지먼트 회사" },
          { key: "주소", value: "서울특별시 서대문구 연세로 9길 14, 4층(창천동)" },
          { key: "연락처", value: "02-6229-9229" },
          { key: "이메일", value: "contact@grigoent.co.kr" },
        ]}
      />

      {/* 슬라이드3: 슬로건/브랜딩 히어로 */}
      <Hero />

      {/* 슬라이드4: 조직/사업구조 */}
      <Divisions />

      {/* 슬라이드2: 회사 카드 이미지 업로드 */}
      <section className="py-14">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6">회사 소개 카드</h2>
        {content.companyCard ? (
          <img src={content.companyCard} alt="회사 카드" className="w-full rounded-xl" />
        ) : (
          <UploadImageBox ratioClass="aspect-[16/9]" alt="회사 카드" />
        )}
      </section>

      {/* 슬라이드11: 아티스트 안무 시안 영상 */}
      <section className="py-14">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6">포트폴리오 영상</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <VideoCard id="KxwZl2Z1s3o" title="라치카 – 안무 리허설" />
          <VideoCard id="e-ORhEE9VVg" title="팀 무브 – 공연 하이라이트" />
          <VideoCard id="FlsCjmMhFmw" title="랩댄스 쇼케이스" />
        </div>
      </section>

      {/* 슬라이드7,8: 소속 아티스트 */}
      <ArtistsCarousel />

      {/* 슬라이드18~21: 광고주/프로필/매거진 섹션 → 갤러리 */}
      <GalleryLightbox
        items={
          content.gallery?.length
            ? content.gallery.map((g) => ({ src: g.src, w: g.w ?? 1600, h: g.h ?? 1200 }))
            : [
                { src: "/gallery/1.jpg", w: 1600, h: 1200, alt: "공연 스틸컷 1" },
                { src: "/gallery/2.jpg", w: 1600, h: 1200, alt: "공연 스틸컷 2" },
                { src: "/gallery/3.jpg", w: 1600, h: 1200, alt: "공연 스틸컷 3" },
                { src: "/gallery/4.jpg", w: 1600, h: 1200, alt: "공연 스틸컷 4" },
                { src: "/gallery/5.jpg", w: 1600, h: 1200, alt: "공연 스틸컷 5" },
                { src: "/gallery/6.jpg", w: 1600, h: 1200, alt: "공연 스틸컷 6" },
              ]
        }
      />

      {/* 슬라이드5~6: 연혁 */}
      <Timeline data={timeline} />

      {/* 추가 이미지 업로드 영역 */}
      <section className="py-14">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6">추가 이미지</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(content.additional?.length ? content.additional : [undefined, undefined, undefined]).map((src, i) => (
            src ? (
              <img key={i} src={src} alt={`추가 이미지 ${i + 1}`} className="w-full rounded-xl" />
            ) : (
              <UploadImageBox key={i} />
            )
          ))}
        </div>
      </section>
    </main>
  );
}


