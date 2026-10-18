import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const Select = forwardRef(function Select(
  { label, error, id, className, children, ...rest },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-text">
          {label}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={cn(
          "h-10 w-full rounded-lg border bg-white px-3 text-sm text-text",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          error
            ? "border-danger focus:border-danger"
            : "border-border focus:border-primary",
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
});

export default Select;