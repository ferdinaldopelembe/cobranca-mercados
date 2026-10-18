import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, ChevronDown, LogOut, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { navItems } from "./Sidebar";

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const current =
    navItems.find((item) => location.pathname.startsWith(item.to))?.label ||
    "Dashboard";

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="fixed left-60 right-0 top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-white px-6">
      <h2 className="text-base font-semibold text-text">{current}</h2>

      <div className="relative ml-auto w-72">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Pesquisar…"
          className="h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-text placeholder:text-text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
            <User size={16} />
          </div>
          <span className="text-sm font-medium text-text">
            {user?.name || "Administrador"}
          </span>
          <ChevronDown size={14} className="text-text-muted" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-text">{user?.name}</p>
              <p className="text-xs text-text-muted">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-muted hover:bg-slate-50 hover:text-text"
            >
              <LogOut size={16} />
              Terminar sessão
            </button>
          </div>
        )}
      </div>
    </header>
  );
}