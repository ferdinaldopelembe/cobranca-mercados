import useAuth from "../../context/useAuth";
import ComerciantePagamentoPage from "./ComerciantePagamentoPage";
import EmitirSenhaPage from "../senhas/EmitirSenhaPage";
import { Navigate } from "react-router-dom";

export default function RegistarPagamentoPage() {
  const { user } = useAuth();
  if (user?.role === "Administrador") return <EmitirSenhaPage />;
  if (user?.role === "Comerciante") return <ComerciantePagamentoPage />;
  return <Navigate to="/pagamentos" replace />;
}
