type Row = { key: string; value: string };

export default function CompanyTable({ rows }: { rows: Row[] }) {
  return (
    <section className="py-12">
      <div className="grid md:grid-cols-[1fr_2fr] gap-8 items-start">
        <div className="flex items-center justify-center">
          <div className="rounded-xl bg-zinc-900/40 ring-1 ring-zinc-800 px-6 py-10 text-center">
            <div className="text-3xl font-black tracking-wider">그ᄅ리고</div>
            <div className="text-sm text-zinc-400 mt-2">GRIGO ENTERTAINMENT</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl ring-1 ring-zinc-800">
          <table className="w-full text-left">
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.key} className={i % 2 ? "bg-zinc-900/30" : "bg-zinc-900/10"}>
                  <th className="w-40 md:w-56 px-4 md:px-6 py-4 font-semibold align-top">{r.key}</th>
                  <td className="px-4 md:px-6 py-4 text-zinc-300">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}


