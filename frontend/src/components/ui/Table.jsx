import { cn } from "../../lib/cn";

export function Table({ children, className }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead>
      <tr className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-text-muted">
        {children}
      </tr>
    </thead>
  );
}

export function TH({ children, className }) {
  return <th className={cn("px-5 py-3", className)}>{children}</th>;
}

export function TBody({ children }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function TR({ children, className }) {
  return (
    <tr className={cn("h-13 hover:bg-slate-50/60", className)}>{children}</tr>
  );
}

export function TD({ children, className }) {
  return <td className={cn("px-5 py-3", className)}>{children}</td>;
}