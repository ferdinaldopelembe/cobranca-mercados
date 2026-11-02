import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import useAuth from "./context/useAuth";
import LanguageProvider from "./context/LanguageProvider";
import { ProtectedRoute } from "./routes/router";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";
import FiscaisPage from "./features/fiscais/FiscaisPage";
import NovoFiscalPage from "./features/fiscais/NovoFiscalPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import MercadosPage from "./features/mercados/MercadosPage";
import MercadoDetailPage from "./features/mercados/MercadoDetailPage";
import ComerciantesPage from "./features/comerciantes/ComerciantesPage";
import NovoComerciantePage from "./features/comerciantes/NovoComerciantePage";
import PagamentosPage from "./features/pagamentos/PagamentosPage";
import RegistarPagamentoPage from "./features/pagamentos/RegistarPagamentoPage";
import TaxasPage from "./features/taxas/TaxasPage";
import SenhasPage from "./features/senhas/SenhasPage";
import RelatoriosPage from "./features/relatorios/RelatoriosPage";
import NovaTaxaPage from "./features/taxas/NovaTaxaPage";
import EmitirSenhaPage from "./features/senhas/EmitirSenhaPage";
import AuditoriaPage from "./features/auditoria/AuditoriaPage";
import ConfiguracoesPage from "./features/configuracoes/ConfiguracoesPage";
import StaffUsersPage from "./features/configuracoes/StaffUsersPage";
import MerchantDashboardPage from "./features/dashboard/MerchantDashboardPage";

function HomeRedirect() {
  const { user } = useAuth();
  return (
    <Navigate
      to={["Administrador", "Comerciante"].includes(user?.role) ? "/dashboard" : "/pagamentos"}
      replace
    />
  );
}

function RoleDashboardPage() {
  const { user } = useAuth();
  if (user?.role === "Administrador") return <DashboardPage />;
  if (user?.role === "Comerciante") return <MerchantDashboardPage />;
  return <Navigate to="/pagamentos" replace />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registo" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/dashboard" element={<RoleDashboardPage />} />
                <Route path="/pagamentos" element={<PagamentosPage />} />
                <Route path="/pagamentos/novo" element={<RegistarPagamentoPage />} />

                <Route element={<ProtectedRoute allowedRoles={["Administrador"]} />}>
                  <Route path="/mercados" element={<MercadosPage />} />
                  <Route path="/mercados/:id" element={<MercadoDetailPage />} />
                  <Route path="/comerciantes" element={<ComerciantesPage />} />
                  <Route path="/comerciantes/novo" element={<NovoComerciantePage />} />
                  <Route path="/taxas" element={<TaxasPage />} />
                  <Route path="/taxas/nova" element={<NovaTaxaPage />} />
                  <Route path="/senhas" element={<SenhasPage />} />
                  <Route path="/senhas/nova" element={<EmitirSenhaPage />} />
                  <Route path="/senhas/:id" element={<Navigate to="/senhas" replace />} />
                  <Route path="/fiscais" element={<FiscaisPage />} />
                  <Route path="/fiscais/novo" element={<NovoFiscalPage />} />
                  <Route path="/auditoria" element={<AuditoriaPage />} />
                  <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                  <Route path="/utilizadores" element={<StaffUsersPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={["Administrador", "Gestor Financeiro"]} />}>
                  <Route path="/relatorios" element={<RelatoriosPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}