import { cn } from "../../lib/cn";

const variants = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  neutral: "bg-slate-100 text-slate-600",
};

export default function Badge({ variant = "neutral", children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variants[variant]
      )}
    >
      {children}
    </span>
  );
}