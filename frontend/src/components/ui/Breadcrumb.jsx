import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-text-muted">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {item.to && !last ? (
              <Link to={item.to} className="hover:text-text">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "text-text" : ""}>{item.label}</span>
            )}
            {!last && <ChevronRight size={14} className="text-text-muted/60" />}
          </span>
        );
      })}
    </nav>
  );
}