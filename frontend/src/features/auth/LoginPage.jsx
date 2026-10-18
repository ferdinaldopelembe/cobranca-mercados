import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Landmark, QrCode, Wallet, TrendingUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

const highlights = [
  { icon: QrCode, text: "Senhas digitais com QR code" },
  { icon: Wallet, text: "Pagamentos por M-Pesa, e-Mola e Mkesh" },
  { icon: TrendingUp, text: "Relatórios de arrecadação em tempo real" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ identifier, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Painel esquerdo — verde sólido */}
      <aside className="hidden w-[45%] flex-col justify-between bg-primary p-12 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
              <Landmark size={22} className="text-white" />
            </div>
            <span className="text-lg font-semibold">Cobrança Beira</span>
          </div>

          <h1 className="mt-16 max-w-md text-3xl font-semibold leading-snug">
            Cobrança de Taxas em Mercados Informais
          </h1>
          <p className="mt-3 text-base text-white/70">Município da Beira</p>

          <ul className="mt-12 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                <Icon size={18} className="text-white/60" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/50">© 2026 Município da Beira</p>
      </aside>

      {/* Painel direito — formulário */}
      <main className="flex w-full items-center justify-center px-6 lg:w-[55%]">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Landmark size={18} className="text-white" />
            </div>
            <span className="text-base font-semibold text-text">Cobrança Beira</span>
          </div>

          <h2 className="text-2xl font-semibold text-text">Entrar</h2>
          <p className="mt-1 text-sm text-text-muted">
            Acesse o painel de gestão do município.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              id="identifier"
              label="Telefone ou e-mail"
              type="text"
              autoComplete="username"
              placeholder="admin@beira.gov.mz"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <Input
              id="password"
              label="Senha"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm font-medium text-primary hover:text-primary-hover"
                onClick={() => alert("Recuperação de senha será enviada por SMS (mock).")}
              >
                Esqueci a minha senha
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-sm text-danger">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || !identifier || !password}
            >
              {submitting ? "A entrar…" : "Entrar"}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-text-muted lg:hidden">
            © 2026 Município da Beira
          </p>
        </div>
      </main>
    </div>
  );
}