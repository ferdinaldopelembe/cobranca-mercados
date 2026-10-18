import { cn } from "../../lib/cn";

export default function Tabs({ tabs, value, onChange }) {
  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex gap-6" role="tablist">
        {tabs.map((tab) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.value)}
              className={cn(
                "border-b-2 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              )}
            >
              {tab.label}
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "ml-2 rounded-md px-1.5 py-0.5 text-xs",
                    active
                      ? "bg-primary-soft text-primary"
                      : "bg-slate-100 text-text-muted"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}