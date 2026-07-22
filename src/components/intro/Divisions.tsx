import type { ComponentType } from "react";
import { BriefcaseBusiness, Clapperboard, Network, Tickets } from "lucide-react";
import { companyDivisions, type CompanyDivisionSlug } from "@/lib/company-content";

const iconMap: Record<CompanyDivisionSlug, ComponentType<{ className?: string }>> = {
  grigo: BriefcaseBusiness,
  deetz: Network,
  flowmaker: Tickets,
  reactstudio: Clapperboard,
};

export default function Divisions() {
  return (
    <section className="py-16">
      <h2 className="text-2xl md:text-3xl font-semibold mb-8">그리고 엔터테인먼트 계열사 소개</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {companyDivisions.map((division) => {
          const Icon = iconMap[division.slug];

          return (
          <div key={division.slug} className="rounded-lg ring-1 ring-zinc-800 bg-zinc-900/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-5 h-5" />
              <h3 className="font-semibold">{division.shortTitle}</h3>
            </div>
            <p className="mb-3 text-sm font-medium text-zinc-200">{division.title}</p>
            <ul className="text-sm text-zinc-300 space-y-1 list-disc pl-4">
              {division.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </div>
          );
        })}
      </div>
    </section>
  );
}


