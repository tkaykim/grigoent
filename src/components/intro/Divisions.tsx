import { Briefcase, Film, Megaphone, Ticket } from "lucide-react";

const items = [
  { icon: Briefcase, title: "매니지먼트", bullets: ["소속 아티스트 케어", "스케줄 관리", "기업/경영 관리", "안무 제작", "공연·방송 출연"] },
  { icon: Ticket, title: "공연기획팀", bullets: ["경연대회·댄스배틀 운영", "공연 디자인 작업", "스트릿·댄스 기반 행사", "관공서 행사 진행"] },
  { icon: Film, title: "미디어콘텐츠팀", bullets: ["아티스트 콘텐츠 기획", "영상 편집/운영", "화보·프로필 촬영", "댄스/뮤직/웹 예능"] },
  { icon: Megaphone, title: "광고사업부", bullets: ["오프라인 행사", "촬영/댄서 컨택 및 섭외 진행"] },
];

export default function Divisions() {
  return (
    <section className="py-16">
      <h2 className="text-2xl md:text-3xl font-semibold mb-8">그리고 엔터테인먼트 계열사 소개</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((it) => (
          <div key={it.title} className="rounded-2xl ring-1 ring-zinc-800 bg-zinc-900/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <it.icon className="w-5 h-5" />
              <h3 className="font-semibold">{it.title}</h3>
            </div>
            <ul className="text-sm text-zinc-300 space-y-1 list-disc pl-4">
              {it.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}


