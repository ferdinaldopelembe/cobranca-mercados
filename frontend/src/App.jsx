import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/router";
import LoginPage from "./features/auth/LoginPage";

// Placeholder temporário — será substituído pelo AppLayout no próximo passo
function DashboardPlaceholder() {
  const { logout, user } = require("./context/AuthContext").useAuth
    ? null
    : null;
  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <div className="p-10">
                  <h1 className="text-2xl font-semibold">Dashboard (em construção)</h1>
                  <p className="mt-2 text-sm text-text-muted">
                    Próxima tela do PDF.
                  </p>
                </div>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}