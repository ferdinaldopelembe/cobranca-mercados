import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <Topbar />
      <main className="ml-60 pt-16">
        <div className="mx-auto max-w-[1440px] px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}