import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { api, apiPost } from "../../lib/api";
import { mapApiPayment } from "./paymentView";
import { formatMT } from "../../lib/format";

export default function FiscalOperationsPage() {
  const [payments, setPayments] = useState([]);
  const [reference, setReference] = useState("");
  const [selected, setSelected] = useState(null);
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

  async function searchReference(event) {
    event.preventDefault();
    setError("");
    setSelected(null);
    try {
      const payment = await api(`/payments/reference/${encodeURIComponent(reference.trim())}`);
      setSelected(mapApiPayment(payment));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function registerCash(payment) {
    setSavingId(payment.id);
    setError("");
    try {
      const updated = await apiPost(`/payments/${payment.id}/cash`, {});
      setSelected(mapApiPayment(updated));
      await loadPayments();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Validar senhas e registar numerário</h1>
        <p className="mt-1 text-sm text-text-muted">
          Pesquise a referência manualmente. O recebimento fica pendente de confirmação financeira.
        </p>
      </div>
      <Card className="p-5">
        <form onSubmit={searchReference} className="flex flex-wrap gap-3">
          <label className="min-w-60 flex-1 text-sm font-medium">
            Referência da senha
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-border px-3 font-mono font-normal"
              placeholder="PAG-2026-…"
              required
            />
          </label>
          <Button type="submit" className="self-end" disabled={!reference.trim()}>
            <Search size={16} /> Consultar senha
          </Button>
        </form>
        {selected && <PaymentDetails payment={selected} onRegister={() => registerCash(selected)} saving={savingId === selected.id} />}
      </Card>

      {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Senhas do seu mercado</h2>
        {loading && <p className="text-sm text-text-muted">A carregar senhas…</p>}
        {!loading && payments.length === 0 && <p className="text-sm text-text-muted">Não existem senhas neste mercado.</p>}
        {payments.map((payment) => (
          <Card key={payment.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="space-y-1">
              <p className="font-mono text-sm font-semibold">{payment.senha}</p>
              <p className="text-sm">{payment.comerciante} · {payment.banca} · {payment.produto}</p>
              <p className="text-xs text-text-muted">{payment.periodo} · {formatMT(payment.valor)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={payment.estado === "Pago" ? "success" : payment.estado === "Pendente" ? "warning" : "neutral"}>
                {payment.estado}
              </Badge>
              {payment.estado === "Pendente" && (
                <Button onClick={() => registerCash(payment)} disabled={savingId === payment.id}>
                  {savingId === payment.id ? "A registar…" : "Recebi em numerário"}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

function PaymentDetails({ payment, onRegister, saving }) {
  return (
    <div className="mt-5 space-y-3 rounded-lg border border-border bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono font-semibold">{payment.senha}</p>
          <p className="mt-1 text-sm">{payment.comerciante} · {payment.mercado} · {payment.banca}</p>
          <p className="text-sm text-text-muted">{payment.produto} · {payment.periodo} · {formatMT(payment.valor)}</p>
          {payment.expiresAt && <p className="text-xs text-text-muted">Válida até {new Date(payment.expiresAt).toLocaleString("pt-MZ")}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={payment.estado === "Pendente" ? "warning" : payment.estado === "Pago" ? "success" : "neutral"}>{payment.estado}</Badge>
          {payment.estado === "Pendente" && <Button onClick={onRegister} disabled={saving}>{saving ? "A registar…" : "Recebi em numerário"}</Button>}
        </div>
      </div>
      {payment.rejectionReason && <p className="text-sm text-danger">Motivo da rejeição: {payment.rejectionReason}</p>}
    </div>
  );
}
