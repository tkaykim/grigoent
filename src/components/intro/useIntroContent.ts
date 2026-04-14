"use client";
import { useEffect, useState, useCallback } from "react";

export type GalleryItem = { src: string; w?: number; h?: number };
export type IntroContent = {
  companyCard?: string;
  gallery: GalleryItem[];
  additional: string[];
};

const STORAGE_KEY = "intro:content";

function read(): IntroContent {
  if (typeof window === "undefined") return { gallery: [], additional: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { gallery: [], additional: [] };
    const data = JSON.parse(raw) as IntroContent;
    return {
      companyCard: data.companyCard,
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
      additional: Array.isArray(data.additional) ? data.additional : [],
    };
  } catch {
    return { gallery: [], additional: [] };
  }
}

function write(data: IntroContent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useIntroContent() {
  const [content, setContent] = useState<IntroContent>({ gallery: [], additional: [] });

  useEffect(() => {
    setContent(read());
  }, []);

  const update = useCallback((partial: Partial<IntroContent>) => {
    setContent((prev) => {
      const next = { ...prev, ...partial };
      write(next);
      return next;
    });
  }, []);

  return {
    content,
    setCompanyCard: (src?: string) => update({ companyCard: src }),
    setGallery: (items: GalleryItem[]) => update({ gallery: items }),
    setAdditional: (items: string[]) => update({ additional: items }),
  };
}


