import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn";

export default function Pagination({ page = 1, totalPages = 1, onChange }) {
  function go(p) {
    if (p < 1 || p > totalPages) return;
    onChange?.(p);
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 2),
    Math.max(0, page - 2) + 5
  );

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm">
      <span className="text-text-muted">
        Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => go(p)}
            className={cn(
              "h-8 min-w-8 rounded-md px-2 text-sm",
              p === page
                ? "bg-primary text-white"
                : "text-text-muted hover:bg-slate-50"
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-muted hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}