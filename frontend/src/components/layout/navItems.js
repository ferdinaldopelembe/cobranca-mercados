import {
  LayoutDashboard,
  Store,
  Users,
  Receipt,
  Ticket,
  CreditCard,
  CirclePlus,
  ShieldCheck,
  BarChart3,
  History,
  Settings,
  UserCog,
} from "lucide-react";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mercados", label: "Mercados", icon: Store },
  { to: "/comerciantes", label: "Comerciantes", icon: Users },
  { to: "/taxas", label: "Taxas", icon: Receipt },
  { to: "/senhas", label: "Recibos", icon: Ticket },
  { to: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/pagamentos/novo", label: "Gerar senha", icon: CirclePlus },
  { to: "/fiscais", label: "Fiscais", icon: ShieldCheck },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/auditoria", label: "Auditoria", icon: History },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/utilizadores", label: "Utilizadores", icon: UserCog },
];
