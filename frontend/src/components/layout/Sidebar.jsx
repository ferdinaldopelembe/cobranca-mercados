import { NavLink } from "react-router-dom";
import { Landmark, X } from "lucide-react";
import { cn } from "../../lib/cn";
import useLanguage from "../../context/useLanguage";
import { navItems } from "./navItems";
import useAuth from "../../context/useAuth";

export default function Sidebar({ mobileOpen, onClose }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const visibleItems = user?.role === "Administrador"
    ? navItems
    : user?.role === "Gestor Financeiro"
      ? navItems.filter((item) => ["/pagamentos", "/relatorios"].includes(item.to))
      : user?.role === "Comerciante"
        ? navItems.filter((item) => ["/dashboard", "/pagamentos", "/pagamentos/novo"].includes(item.to))
      : navItems.filter((item) => item.to === "/pagamentos");

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-white shadow-sm transition-transform duration-200 md:w-60 md:translate-x-0 md:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Landmark size={18} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-text">Cobrança Beira</span>
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="ml-auto rounded-lg p-2 text-text-muted transition-colors hover:bg-slate-100 md:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-1">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-soft text-primary"
                      : "text-text-muted hover:bg-slate-50 hover:text-text"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={20}
                      strokeWidth={1.75}
                      className={isActive ? "text-primary" : "text-text-muted"}
                    />
                    <span>{t(label)}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border px-5 py-4 text-xs text-text-muted">
        v1.0 · 2026
      </div>
    </aside>
  );
}