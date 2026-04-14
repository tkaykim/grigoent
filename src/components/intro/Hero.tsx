"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative min-h-[70vh] grid place-items-center overflow-hidden">
      {/* Grain overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay [background:radial-gradient(#000_1px,transparent_1px)] [background-size:3px_3px]" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center px-6"
      >
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          그리고 우리는 <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">계속 전진한다</span>
        </h1>
        <p className="mt-4 text-lg md:text-xl text-zinc-300/90">
          댄서 전문 엔터테인먼트 – 매니지먼트 · 공연기획 · 미디어콘텐츠 · 광고
        </p>
      </motion.div>
    </section>
  );
}

