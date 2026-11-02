import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Menu, User } from "lucide-react";
import useAuth from "../../context/useAuth";
import { navItems } from "./navItems";
import useLanguage from "../../context/useLanguage";
import { api, apiPatch } from "../../lib/api";

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const menuRef = useRef(null);

  const isIssuancePage = ["/pagamentos/novo", "/senhas/nova"].includes(location.pathname);
  const current = isIssuancePage
    ? "Emitir senha"
    : t(
      [...navItems]
        .sort((a, b) => b.to.length - a.to.length)
        .find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`))
        ?.label || "Dashboard",
    );

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message);
    }
  }

  async function toggleNotifications() {
    setNotificationError("");
    if (!notificationsOpen) {
      try {
        setNotifications(await api("/notifications"));
      } catch (error) {
        setNotificationError(error.message);
      }
    }
    setNotificationsOpen((current) => !current);
  }

  async function markNotificationRead(notification) {
    try {
      const updated = await apiPatch(`/notifications/${notification.id}/read`, {});
      setNotifications((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setNotificationError(error.message);
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <header className="fixed left-0 right-0 top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-white/95 px-3 backdrop-blur sm:gap-4 sm:px-6 md:left-60">
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-text-muted transition-colors hover:bg-slate-100 md:hidden"
      >
        <Menu size={19} />
      </button>
      <h2 className="truncate text-sm font-semibold text-text sm:text-base">
        {current}
      </h2>

      <div className="relative ml-auto">
        <button
          type="button"
          onClick={toggleNotifications}
          aria-label="Notificações"
          className="relative rounded-lg p-2 text-text-muted transition-colors hover:bg-slate-100"
        >
          <Bell size={19} />
          {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{unreadCount}</span>}
        </button>
        {notificationsOpen && (
          <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
            <div className="border-b border-border px-4 py-3 text-sm font-semibold">Notificações</div>
            <div className="max-h-80 overflow-y-auto">
              {notificationError && <p role="alert" className="px-4 py-3 text-xs text-danger">{notificationError}</p>}
              {!notificationError && notifications.length === 0 && <p className="px-4 py-4 text-sm text-text-muted">Sem notificações.</p>}
              {notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => markNotificationRead(notification)}
                  className={`block w-full border-b border-border px-4 py-3 text-left last:border-0 ${notification.readAt ? "bg-white" : "bg-primary/5"}`}
                >
                  <span className="block text-sm font-medium">{notification.title}</span>
                  <span className="mt-1 block text-xs text-text-muted">{notification.message}</span>
                  <span className="mt-1 block text-[11px] text-text-muted">{new Date(notification.createdAt).toLocaleString("pt-MZ")}{notification.readAt ? " · Lida" : " · Marcar como lida"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
            <User size={16} />
          </div>
          <span className="hidden max-w-36 truncate text-sm font-medium text-text sm:block">
            {t(user?.name || "Administrador")}
          </span>
          <ChevronDown size={14} className="text-text-muted" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-white shadow-lg">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-text">
                {t(user?.name || "Administrador")}
              </p>
              <p className="text-xs text-text-muted">{t(user?.role || "")}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-muted hover:bg-slate-50 hover:text-text"
            >
              <LogOut size={16} />
              {t("Terminar sessão")}
            </button>
          </div>
        )}
      </div>
      {logoutError && <p role="alert" className="text-xs text-danger">{logoutError}</p>}
    </header>
  );
}