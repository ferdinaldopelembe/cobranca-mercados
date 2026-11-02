import { cn } from "../../lib/cn";

export default function Card({ className, children }) {
  return (
    <div className={cn("rounded-xl border border-border bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}