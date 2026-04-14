"use client";
import { motion } from "framer-motion";

type Event = { year: string; items: string[] };

export default function Timeline({ data }: { data: Event[] }) {
  return (
    <section className="py-16">
      <h2 className="text-2xl md:text-3xl font-semibold mb-8">연혁</h2>
      <div className="relative">
        <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-zinc-800/60" />
        <ul className="space-y-10">
          {data.map((ev, i) => (
            <motion.li
              key={ev.year}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="grid md:grid-cols-2 gap-6 items-start"
            >
              <div className="pl-8 md:pl-0 md:text-right relative">
                <span className="md:mr-6 inline-block text-xl font-bold">{ev.year}</span>
                <span className="absolute left-3 md:left-[calc(50%-6px)] top-1.5 size-3 rounded-full bg-white" />
              </div>
              <ul className="prose prose-invert prose-zinc max-w-none text-zinc-300 list-disc pl-6">
                {ev.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

