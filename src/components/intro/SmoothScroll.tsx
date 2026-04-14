"use client";
import { useEffect } from "react";

export default function SmoothScroll() {
  useEffect(() => {
    let cleanup: (() => void) | undefined
    import("lenis").then(({ default: Lenis }) => {
      const lenis = new Lenis({ smoothWheel: true }) as any
      const raf = (time: number) => {
        lenis.raf(time)
        requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)
      cleanup = () => (lenis as any).destroy?.()
    })
    return () => cleanup?.()
  }, [])
  return null
}

