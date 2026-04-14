import Timeline from "@/components/intro/Timeline";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "그리고 엔터테인먼트 – History",
  description: "그리고 엔터테인먼트 연혁",
};

const history = [
  {
    year: "2020",
    items: [
      "08월: 유튜브 콘텐츠 제작사 <그리고 스튜디오> 설립",
      "08월: 댄서 '리안' 영입, <댄서 리안의 JOB다한 일상> 콘텐츠 제작",
      "09월: 댄서 'JAYB' 영입",
      "10월: 팀 '라치카'(가비, 시미즈) 영입",
    ],
  },
  {
    year: "2021",
    items: [
      "08월: <스트릿 우먼 파이터> 라치카 출연",
      "09월: 댄서 '모아나' 영입",
      "10월: 종합엔터테인먼트사 <그리고 엔터테인먼트> 출범 및 법인 전환",
      "11월: <스트릿댄스걸스파이터> 라치카 출연",
    ],
  },
  {
    year: "2022",
    items: ["04월: 댄스행사 전문기업 <플로우메이커> 인수합병"],
  },
  {
    year: "2023",
    items: ["06월: 유튜브 예능 <대세갑이주> 기획·제작"],
  },
  {
    year: "2024",
    items: [
      "05월: 유튜브 예능 <디바마을 퀸가비> 기획·제작",
      "06월: 힙합댄스팀 <HANYA>, <Maple:Lip> 영입",
      "09월: 안무가 <레난> 영입",
      "11월: 안무가 <유메키> 영입",
      "12월: <라치카> 전속계약 만료",
    ],
  },
  {
    year: "2025",
    items: [
      "02월: 아이키 팬미팅 행사 <마법학교> 기획·제작·운영",
      "07월: 소속댄서 유메키 Mnet <보이즈 2 플래닛> 출연",
      "09월: 광고사업부 <AST company> 분사",
    ],
  },
];

export default function Page() {
  return (
    <main className="container mx-auto px-4">
      {/* 헤더: 슬라이드 무드 유지(심플 라인 + 타이틀) */}
      <section className="relative py-16 md:py-24 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay [background:radial-gradient(#000_1px,transparent_1px)] [background-size:3px_3px]" />
        <div className="space-y-4 relative">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">HISTORY</h1>
          <div className="h-px w-11/12 max-w-5xl mx-auto bg-zinc-700/50" />
          <p className="text-lg md:text-xl text-zinc-300">그리고 엔터테인먼트 연혁</p>
        </div>
      </section>

      <Timeline data={history} />
    </main>
  );
}


