"use client";
import UploadImageBox from "@/components/intro/UploadImageBox";
import { useIntroContent } from "@/components/intro/useIntroContent";

export default function ManageIntroPage() {
  const { content, setCompanyCard, setGallery, setAdditional } = useIntroContent();

  return (
    <main className="container mx-auto px-4 py-10 space-y-12">
      <header>
        <h1 className="text-3xl font-bold">Intro 관리</h1>
        <p className="text-zinc-400 mt-2">이미지를 업로드하면 즉시 저장됩니다(localStorage). 추후 Supabase 연동 가능.</p>
      </header>

      {/* 회사 카드 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">회사 소개 카드(슬라이드2)</h2>
        <UploadImageBox
          initialSrc={content.companyCard}
          ratioClass="aspect-[16/9]"
          onChange={(src) => setCompanyCard(src)}
        />
      </section>

      {/* 갤러리 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">갤러리(슬라이드18~21)</h2>
          <button
            className="text-sm px-3 py-1 rounded border border-zinc-700 hover:bg-zinc-800"
            onClick={() => setGallery([])}
          >전체 초기화</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.gallery.map((g, i) => (
            <UploadImageBox
              key={i}
              initialSrc={g.src}
              onChange={(src) => {
                const next = [...content.gallery];
                next[i] = { src };
                setGallery(next);
              }}
            />
          ))}
          <UploadImageBox
            onChange={(src) => setGallery([...(content.gallery || []), { src }])}
          />
        </div>
      </section>

      {/* 추가 이미지 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">추가 이미지</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(content.additional || []).map((src, i) => (
            <UploadImageBox
              key={i}
              initialSrc={src}
              onChange={(newSrc) => {
                const next = [...content.additional];
                next[i] = newSrc;
                setAdditional(next);
              }}
            />
          ))}
          <UploadImageBox onChange={(src) => setAdditional([...(content.additional || []), src])} />
        </div>
      </section>
    </main>
  );
}


