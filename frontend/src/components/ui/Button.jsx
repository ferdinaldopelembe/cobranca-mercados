import { cn } from "../../lib/cn";

const variants = {
  primary:
    "bg-primary text-white hover:bg-primary-hover disabled:opacity-60",
  secondary:
    "bg-white text-text border border-border hover:bg-slate-50",
  ghost: "bg-transparent text-text-muted hover:bg-slate-100",
};

const sizes = {
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
        "disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}