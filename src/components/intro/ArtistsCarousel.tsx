"use client";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";

const artists = [
  { name: "JAY B", img: "/artists/jayb.jpg" },
  { name: "MOANA", img: "/artists/moana.jpg" },
  { name: "EMILY", img: "/artists/emily.jpg" },
  { name: "EITCH", img: "/artists/eitch.jpg" },
];

export default function ArtistsCarousel() {
  const [ref] = useEmblaCarousel({ loop: true, align: "start" });

  return (
    <section className="py-12">
      <h2 className="text-2xl md:text-3xl font-semibold mb-6">소속 아티스트</h2>
      <div className="overflow-hidden" ref={ref as any}>
        <div className="flex gap-6">
          {artists.map((a) => (
            <figure key={a.name} className="shrink-0 w-[260px]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-lg">
                <Image src={a.img} alt={a.name} fill className="object-cover" />
              </div>
              <figcaption className="mt-3 text-center font-medium">{a.name}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

