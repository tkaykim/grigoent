"use client";
import { useRef, useState } from "react";
import { Upload } from "lucide-react";

type Props = {
  initialSrc?: string;
  alt?: string;
  ratioClass?: string; // e.g. "aspect-[16/9]", "aspect-[4/3]"
  onChange?: (dataUrl: string) => void;
  className?: string;
};

export default function UploadImageBox({ initialSrc, alt = "image", ratioClass = "aspect-[4/3]", onChange, className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | undefined>(initialSrc);

  return (
    <div className={`relative ${ratioClass} rounded-xl overflow-hidden bg-zinc-900/40 ring-1 ring-zinc-800 ${className}`}>
      {src ? (
        <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" />
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 grid place-items-center text-zinc-400 hover:text-white transition-colors border-2 border-dashed border-zinc-700"
        >
          <span className="flex items-center gap-2 text-sm font-medium"><Upload className="w-4 h-4" /> 이미지 업로드</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result || "");
            setSrc(dataUrl);
            onChange?.(dataUrl);
          };
          reader.readAsDataURL(file);
        }}
      />
    </div>
  );
}


