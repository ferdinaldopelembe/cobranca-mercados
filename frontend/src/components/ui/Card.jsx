import { cn } from "../../lib/cn";

export default function Card({ className, children }) {
  return (
    <div className={cn("rounded-lg border border-border bg-white", className)}>
      {children}
    </div>
  );
}