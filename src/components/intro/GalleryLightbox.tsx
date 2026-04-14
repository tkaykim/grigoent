"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";

type Item = { src: string; w: number; h: number; alt?: string };

export default function GalleryLightbox({ items }: { items: Item[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let pswp: any;
    const importLib = async () => {
      const [{ default: PhotoSwipeLightbox }] = await Promise.all([
        // @ts-ignore - ESM only in browser
        import("photoswipe/lightbox"),
        import("photoswipe/style.css"),
      ]);
      const lightbox = new PhotoSwipeLightbox({
        gallery: "#pswp-gallery",
        children: "a",
        pswpModule: () => import("photoswipe"),
      });
      lightbox.init();
      pswp = lightbox;
    };
    importLib();
    return () => pswp?.destroy?.();
  }, []);

  return (
    <section className="py-14">
      <h2 className="text-2xl md:text-3xl font-semibold mb-6">프로젝트 갤러리</h2>
      <div id="pswp-gallery" ref={containerRef} className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((it, i) => (
          <a key={i} href={it.src} data-pswp-width={it.w} data-pswp-height={it.h} className="group block overflow-hidden rounded-xl">
            <div className="relative aspect-[4/3]">
              <Image src={it.src} alt={it.alt || "gallery image"} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}


