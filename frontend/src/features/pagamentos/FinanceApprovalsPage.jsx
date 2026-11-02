import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { api, apiPost } from "../../lib/api";
import { exportReceiptPdf } from "../../utils/exportReceiptPdf";
import { mapApiPayment } from "./paymentView";
import { formatMT } from "../../lib/format";

export default function FinanceApprovalsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  async function loadPayments() {
    setPayments((await api("/payments")).map(mapApiPayment));
  }

  useEffect(() => {
    let active = true;
    api("/payments")
      .then((items) => { if (active) setPayments(items.map(mapApiPayment)); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function review(payment, action) {
    const reason = action === "reject"
      ? window.prompt("Indique o motivo da rejeição:")
      : null;
    if (action === "reject" && !reason?.trim()) return;
    setSavingId(payment.id);
    setError("");
    try {
      await apiPost(`/payments/${payment.id}/${action}`, action === "reject" ? { reason } : {});
      await loadPayments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingId(null);
    }
  }

  const waiting = payments.filter((payment) => payment.estado === "Aguardando confirmação");
  const confirmed = payments.filter((payment) => payment.estado === "Pago");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Confirmação financeira</h1>
        <p className="mt-1 text-sm text-text-muted">Confirme recebimentos em numerário registados por fiscais do mercado autorizado.</p>
      </div>
      {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">À espera de confirmação ({waiting.length})</h2>
        {loading && <p className="text-sm text-text-muted">A carregar pagamentos…</p>}
        {!loading && waiting.length === 0 && <p className="text-sm text-text-muted">Não existem pagamentos por confirmar.</p>}
        {waiting.map((payment) => (
          <Card key={payment.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="space-y-1">
              <p className="font-mono text-sm font-semibold">{payment.senha}</p>
              <p className="text-sm">{payment.comerciante} · {payment.mercado} · {payment.banca}</p>
              <p className="text-xs text-text-muted">{payment.produto} · {payment.periodo} · Fiscal: {payment.cashier || "—"}</p>
              <p className="text-sm font-semibold">{formatMT(payment.valor)}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => review(payment, "confirm")} disabled={savingId === payment.id}>
                {savingId === payment.id ? "A guardar…" : "Confirmar"}
              </Button>
              <Button variant="secondary" onClick={() => review(payment, "reject")} disabled={savingId === payment.id}>Rejeitar</Button>
            </div>
          </Card>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pagamentos confirmados ({confirmed.length})</h2>
        {confirmed.map((payment) => (
          <Card key={payment.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="font-mono text-sm font-semibold">{payment.senha}</p>
              <p className="text-sm">{payment.comerciante} · {payment.mercado} · {formatMT(payment.valor)}</p>
              <p className="text-xs text-text-muted">Confirmado por {payment.confirmedBy || "—"} · {payment.data}</p>
            </div>
            <Button variant="secondary" onClick={() => exportReceiptPdf(payment)}><Printer size={16} /> Imprimir recibo</Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
