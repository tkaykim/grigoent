export function WorksSection() {
  return (
    <section id="works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6">
            Our Works
          </h2>
          <p className="text-xl text-zinc-600 max-w-3xl mx-auto">
            우리 댄서들이 참여한 다양한 프로젝트들을 확인해보세요.
            각각의 작품은 열정과 창의성이 담긴 결과물입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 샘플 작품들 */}
          <div className="group relative overflow-hidden rounded-lg">
            <div className="aspect-video bg-zinc-200 flex items-center justify-center">
              <span className="text-zinc-500 text-lg">작품 이미지</span>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <h3 className="text-lg font-semibold mb-2">아이돌 그룹 안무</h3>
                <p className="text-sm">K-POP 아이돌 그룹 타이틀곡 안무 제작</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-lg">
            <div className="aspect-video bg-zinc-200 flex items-center justify-center">
              <span className="text-zinc-500 text-lg">작품 이미지</span>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <h3 className="text-lg font-semibold mb-2">콘서트 퍼포먼스</h3>
                <p className="text-sm">대형 콘서트 메인 댄서 참여</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-lg">
            <div className="aspect-video bg-zinc-200 flex items-center justify-center">
              <span className="text-zinc-500 text-lg">작품 이미지</span>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <h3 className="text-lg font-semibold mb-2">광고 CF</h3>
                <p className="text-sm">브랜드 광고 안무 및 출연</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-lg">
            <div className="aspect-video bg-zinc-200 flex items-center justify-center">
              <span className="text-zinc-500 text-lg">작품 이미지</span>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <h3 className="text-lg font-semibold mb-2">TV 프로그램</h3>
                <p className="text-sm">댄스 경연 프로그램 출연</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-lg">
            <div className="aspect-video bg-zinc-200 flex items-center justify-center">
              <span className="text-zinc-500 text-lg">작품 이미지</span>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <h3 className="text-lg font-semibold mb-2">워크샵</h3>
                <p className="text-sm">K-POP 댄스 워크샵 진행</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-lg">
            <div className="aspect-video bg-zinc-200 flex items-center justify-center">
              <span className="text-zinc-500 text-lg">작품 이미지</span>
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <h3 className="text-lg font-semibold mb-2">뮤지컬</h3>
                <p className="text-sm">뮤지컬 안무 및 출연</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 