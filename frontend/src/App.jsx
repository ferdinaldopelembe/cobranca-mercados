import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/router";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";

// Placeholders temporários — cada um será substituído na sua tela
function Placeholder({ title }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text">{title}</h1>
      <p className="mt-2 text-sm text-text-muted">
        Esta tela será implementada no próximo passo.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/mercados" element={<Placeholder title="Mercados" />} />
              <Route path="/mercados/:id" element={<Placeholder title="Detalhe do mercado" />} />
              <Route path="/comerciantes" element={<Placeholder title="Comerciantes" />} />
              <Route path="/comerciantes/novo" element={<Placeholder title="Novo comerciante" />} />
              <Route path="/taxas" element={<Placeholder title="Taxas" />} />
              <Route path="/senhas" element={<Placeholder title="Senhas" />} />
              <Route path="/pagamentos" element={<Placeholder title="Pagamentos" />} />
              <Route path="/fiscais" element={<Placeholder title="Fiscais" />} />
              <Route path="/relatorios" element={<Placeholder title="Relatórios" />} />
              <Route path="/auditoria" element={<Placeholder title="Auditoria" />} />
              <Route path="/configuracoes" element={<Placeholder title="Configurações" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}