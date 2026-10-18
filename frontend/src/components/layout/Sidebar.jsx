import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Store,
  Users,
  Receipt,
  Ticket,
  CreditCard,
  ShieldCheck,
  BarChart3,
  History,
  Settings,
  Landmark,
} from "lucide-react";
import { cn } from "../../lib/cn";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mercados", label: "Mercados", icon: Store },
  { to: "/comerciantes", label: "Comerciantes", icon: Users },
  { to: "/taxas", label: "Taxas", icon: Receipt },
  { to: "/senhas", label: "Senhas", icon: Ticket },
  { to: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/fiscais", label: "Fiscais", icon: ShieldCheck },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/auditoria", label: "Auditoria", icon: History },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-border bg-white">
      {/* Logótipo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Landmark size={18} className="text-white" />
        </div>
        <span className="text-sm font-semibold text-text">Cobrança Beira</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border px-5 py-3 text-xs text-text-muted">
        v1.0 · 2026
      </div>
    </aside>
  );
}