import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Clock3,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import useAuth from "../../context/useAuth";
import { api } from "../../lib/api";
import { exportReceiptPdf } from "../../utils/exportReceiptPdf";
import { mapApiPayment } from "../pagamentos/paymentView";

const formatMT = (amount) =>
  Number(amount).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " MT";

const unpaidStatuses = new Set([
  "Pendente",
  "Aguardando confirmação",
  "Expirada",
  "Rejeitado",
]);

function statusStyle(status) {
  if (status === "Pago") return "bg-emerald-50 text-emerald-800";
  if (status === "Expirada" || status === "Rejeitado") return "bg-red-50 text-red-800";
  return "bg-amber-50 text-amber-800";
}

function latestObligations(payments) {
  const seen = new Set();
  return payments.filter((payment) => {
    const key = `${payment.produto}:${payment.tipo}:${payment.periodStart}:${payment.periodEnd}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function MerchantDashboardPage() {
  const { user, refreshUser } = useAuth();
  const [payments, setPayments] = useState([]);
  const [rate, setRate] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [merchantStatus, setMerchantStatus] = useState(user?.status || "Regular");
  const [statusReason, setStatusReason] = useState(user?.statusReason || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const paymentItems = await api("/payments");
        if (!active) return;
        setPayments(paymentItems.map(mapApiPayment));

        const [account, rates, notices] = await Promise.all([
          refreshUser(),
          user?.marketId
            ? api(`/catalog/rates?marketId=${user.marketId}`)
            : Promise.resolve([]),
          api("/notifications"),
        ]);
        if (!active) return;
        setMerchantStatus(account.status || "Regular");
        setStatusReason(account.statusReason || "");
        setRate(rates.find((item) => item.product === account.produto) || null);
        setNotifications(notices);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [refreshUser, user?.marketId]);

  const pendingPayments = useMemo(
    () => latestObligations(payments).filter((payment) => unpaidStatuses.has(payment.estado)),
    [payments]
  );
  const expiredCount = useMemo(
    () => latestObligations(payments).filter((payment) => payment.estado === "Expirada").length,
    [payments]
  );
  const paidTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.estado === "Pago")
        .reduce((sum, payment) => sum + payment.valor, 0),
    [payments]
  );
  const unpaidTotal = useMemo(
    () => pendingPayments.reduce((sum, payment) => sum + payment.valor, 0),
    [pendingPayments]
  );
  const recentPayments = payments.slice(0, 4);
  const isBlocked = merchantStatus === "Bloqueado";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{user?.mercado || "Área do comerciante"}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            Olá, {user?.name?.split(" ")[0] || "Comerciante"}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Consulte a sua taxa, acompanhe as senhas e mantenha os pagamentos em dia.
          </p>
        </div>
        {!isBlocked && (
          <Link to="/pagamentos/novo">
            <Button className="w-full sm:w-auto">
              <ReceiptText size={17} />
              Gerar senha
            </Button>
          </Link>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {isBlocked && (
        <Card className="flex gap-3 border-red-200 bg-red-50 p-4 text-red-900">
          <AlertTriangle className="mt-0.5 shrink-0" size={20} />
          <div>
            <h2 className="font-semibold">A sua conta está bloqueada para novas senhas</h2>
            <p className="mt-1 text-sm">
              {statusReason || "Há mais de três senhas expiradas por pagar."} Consulte o histórico ou contacte a administração para regularizar a situação.
            </p>
          </div>
        </Card>
      )}

      <section aria-label="Resumo dos pagamentos" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">Por regularizar</p>
            <WalletCards size={18} className="text-amber-700" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-text">{formatMT(unpaidTotal)}</p>
          <p className="mt-1 text-xs text-text-muted">{pendingPayments.length} senha(s) por pagar</p>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">Senhas expiradas</p>
            <Clock3 size={18} className={expiredCount ? "text-danger" : "text-text-muted"} />
          </div>
          <p className="mt-3 text-2xl font-semibold text-text">{expiredCount}</p>
          <p className="mt-1 text-xs text-text-muted">Incluídas no valor por regularizar</p>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">Pagamentos confirmados</p>
            <CheckCircle2 size={18} className="text-success" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-text">{formatMT(paidTotal)}</p>
          <p className="mt-1 text-xs text-text-muted">
            {payments.filter((payment) => payment.estado === "Pago").length} pagamento(s)
          </p>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">Situação da conta</p>
            {isBlocked
              ? <AlertTriangle size={18} className="text-danger" />
              : <CheckCircle2 size={18} className="text-success" />}
          </div>
          <p className={`mt-3 text-xl font-semibold ${isBlocked ? "text-danger" : "text-success"}`}>
            {merchantStatus}
          </p>
          <p className="mt-1 text-xs text-text-muted">Estado do seu acesso</p>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-muted">Taxa do seu negócio</p>
              <h2 className="mt-1 text-lg font-semibold text-text">
                {rate?.product || user?.produto || "Taxa não disponível"}
              </h2>
            </div>
            <ReceiptText size={19} className="text-primary" />
          </div>
          {rate ? (
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">Valor e periodicidade</p>
                <p className="mt-1 text-xl font-semibold text-text">{formatMT(rate.amount)}</p>
                <p className="mt-1 text-sm text-text-muted">{rate.periodicity}</p>
              </div>
              <div className="text-sm text-text-muted">
                <p>Mercado: <span className="font-medium text-text">{user?.mercado || "—"}</span></p>
                <p className="mt-1">Banca: <span className="font-medium text-text">{user?.banca || "—"}</span></p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              {loading ? "A carregar os dados da taxa…" : "Não foi encontrada uma taxa activa para o seu negócio. Contacte a administração."}
            </p>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-muted">Avisos e lembretes</p>
              <h2 className="mt-1 text-lg font-semibold text-text">Notificações recentes</h2>
            </div>
            <Bell size={19} className="text-primary" />
          </div>
          {notifications.length ? (
            <ul className="mt-4 divide-y divide-border">
              {notifications.slice(0, 3).map((notification) => (
                <li key={notification.id} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-text">{notification.title}</p>
                  <p className="mt-1 text-xs leading-5 text-text-muted">{notification.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              {loading ? "A carregar notificações…" : "Não tem notificações por enquanto."}
            </p>
          )}
        </Card>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="font-semibold text-text">Senhas e pagamentos recentes</h2>
            <p className="mt-1 text-xs text-text-muted">As senhas expiradas continuam disponíveis no seu histórico.</p>
          </div>
          <Link to="/pagamentos" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Ver histórico <ArrowUpRight size={15} />
          </Link>
        </div>
        {loading && <p className="px-4 py-5 text-sm text-text-muted">A carregar pagamentos…</p>}
        {!loading && recentPayments.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-text-muted">Ainda não tem senhas emitidas.</p>
            {!isBlocked && (
              <Link to="/pagamentos/novo" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                Gerar a primeira senha
              </Link>
            )}
          </div>
        )}
        {recentPayments.length > 0 && (
          <ul className="divide-y divide-border">
            {recentPayments.map((payment) => (
              <li key={payment.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-medium text-text">{payment.senha}</p>
                  <p className="mt-1 text-sm text-text-muted">{payment.taxa} · {payment.periodo}</p>
                  {payment.estado !== "Pago" && payment.expiresAt && (
                    <p className="mt-1 text-xs text-text-muted">
                      Válida até {new Date(payment.expiresAt).toLocaleString("pt-MZ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text">{formatMT(payment.valor)}</p>
                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle(payment.estado)}`}>
                      {payment.estado}
                    </span>
                  </div>
                  {payment.estado === "Pago" && (
                    <button
                      type="button"
                      onClick={() => exportReceiptPdf(payment)}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-text hover:bg-slate-50"
                    >
                      Descarregar recibo
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
