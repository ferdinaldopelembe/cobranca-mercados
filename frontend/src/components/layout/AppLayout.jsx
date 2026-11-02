import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fechar navegação"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-y-0 left-64 right-0 z-30 bg-slate-950/30 md:hidden"
        />
      )}
      <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
      <main className="pt-16 md:ml-60">
        <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}