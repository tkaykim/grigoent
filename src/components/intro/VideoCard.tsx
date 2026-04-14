"use client";
import dynamic from "next/dynamic";
const LiteYouTubeEmbed = dynamic(() => import("react-lite-youtube-embed"), { ssr: false });

export function VideoCard({ id, title }: { id: string; title: string }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow">
      {/* @ts-expect-error: type mismatches from external lib */}
      <LiteYouTubeEmbed id={id} title={title} />
      <div className="p-3 text-sm text-zinc-300">{title}</div>
    </div>
  );
}

