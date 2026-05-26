type AdminTableProps = {
  headers: string[];
  rows: Array<string[]>;
  actions?: boolean;
};

export default function AdminTable({ headers, rows, actions = false }: AdminTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/85 shadow-slate-950/10">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="bg-slate-900/80">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-white/10 px-4 py-4 text-xs uppercase tracking-[0.25em] text-slate-400">
                {header}
              </th>
            ))}
            {actions ? <th className="border-b border-white/10 px-4 py-4 text-xs uppercase tracking-[0.25em] text-slate-400">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={index % 2 === 0 ? "bg-slate-950/80" : "bg-slate-900/80"}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-white/10 px-4 py-4 text-slate-300">
                  {cell}
                </td>
              ))}
              {actions ? (
                <td className="border-b border-white/10 px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10">View</button>
                    <button className="rounded-full bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 transition hover:bg-cyan-500/20">Verify</button>
                    <button className="rounded-full bg-amber-500/10 px-3 py-2 text-xs text-amber-200 transition hover:bg-amber-500/20">Suspend</button>
                    <button className="rounded-full bg-red-500/10 px-3 py-2 text-xs text-rose-200 transition hover:bg-red-500/20">Delete</button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
