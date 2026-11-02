import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CircleAlert, ReceiptText, Store, TicketCheck } from "lucide-react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import { api, apiPost } from "../../lib/api";
import { PAYMENT_METHODS } from "../../data/domains";
import { mapApiPayment } from "../pagamentos/paymentView";
import { formatMT } from "../../lib/format";

export default function EmitirSenhaPage() {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState([]);
  const [merchantId, setMerchantId] = useState("");
  const [method, setMethod] = useState("");
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/admin/merchants").then((items) => {
      if (active) setMerchants(items);
    }).catch((requestError) => {
      if (active) setError(requestError.message);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const merchant = merchants.find((item) => item.id === Number(merchantId));
  const rate = merchant && merchant.amount != null
    ? `${merchant.periodicity} · ${formatMT(Number(merchant.amount))}`
    : "Sem taxa activa";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const result = await apiPost("/admin/payments", {
        merchantId: Number(merchantId),
        method,
      });
      setPayment(mapApiPayment(result));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (payment) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary-soft p-2.5 text-primary"><CheckCircle2 size={22} /></div>
          <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Emissão concluída</p><h1 className="mt-1 text-2xl font-semibold">Senha emitida</h1><p className="mt-1 text-sm text-text-muted">O fiscal deve registar o recebimento e a gestão financeira confirmar o pagamento.</p></div>
        </div>
        <Card className="space-y-3 p-5 text-sm sm:p-6">
          <Row label="Referência" value={payment.senha} />
          <Row label="Transacção" value={payment.referencia} />
          <Row label="Comerciante" value={payment.comerciante} />
          <Row label="Mercado / banca" value={`${payment.mercado} · ${payment.banca}`} />
          <Row label="Período" value={`${payment.tipo} · ${payment.periodo}`} />
          <Row label="Método" value={payment.metodo} />
          <Row label="Estado" value={payment.estado} />
          <Row label="Emitida em" value={payment.data} />
          <Row label="Válida até" value={payment.expiresAt ? new Date(payment.expiresAt).toLocaleString("pt-MZ") : "—"} />
          <Row label="Valor devido" value={formatMT(payment.valor)} />
          <div className="flex flex-wrap justify-end gap-2 pt-3">
            <Button variant="secondary" onClick={() => navigate("/pagamentos")}>Ver pagamentos</Button>
            <Button onClick={() => { setPayment(null); setMerchantId(""); setMethod(""); }}>Emitir outra senha</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link to="/pagamentos" className="inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-primary"><ArrowLeft size={16} /> Pagamentos</Link>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary-soft p-2.5 text-primary"><TicketCheck size={22} /></div>
        <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Gestão de pagamentos</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">Emitir senha</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">Seleccione o comerciante e confirme os dados antes de emitir. O valor e o período são definidos pela taxa activa.</p></div>
      </div>
      {loading ? (
        <Card className="flex items-center gap-3 p-5 text-sm text-text-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />A carregar comerciantes…</Card>
      ) : (
        <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.8fr)]">
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold">Dados da emissão</h2>
              <p className="mt-1 text-sm text-text-muted">Os campos assinalados são necessários para continuar.</p>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <Select
                id="ticket-merchant"
                label="Comerciante"
                required
                value={merchantId}
                onChange={(event) => setMerchantId(event.target.value)}
              >
                <option value="">Seleccionar comerciante…</option>
                {merchants.filter((item) => item.status !== "Bloqueado").map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.stall} · {item.market}</option>
                ))}
              </Select>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Método de pagamento</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={method === item}
                      onClick={() => setMethod(item)}
                      className={`flex min-h-12 items-center justify-between rounded-lg border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${method === item ? "border-primary bg-primary-soft text-primary" : "border-border bg-white text-text hover:bg-slate-50"}`}
                    >
                      <span>{item}</span>
                      <span className={`h-4 w-4 rounded-full border ${method === item ? "border-[5px] border-primary" : "border-slate-300"}`} />
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-text-muted">O recebimento em numerário será registado pelo fiscal do mercado.</p>
              </fieldset>
              {error && (
                <div role="alert" className="flex gap-3 rounded-lg border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
                  <CircleAlert size={18} className="mt-0.5 shrink-0" />
                  <div><p className="font-semibold">Não foi possível emitir a senha</p><p className="mt-1 leading-5">{error}</p><Link to="/pagamentos" className="mt-2 inline-flex font-medium underline underline-offset-2 hover:no-underline">Consultar pagamentos</Link></div>
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={() => navigate("/pagamentos")}>Cancelar</Button>
                <Button type="submit" disabled={saving || !merchantId || !method}>
                  {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />A emitir…</> : <><ReceiptText size={16} />Emitir senha</>}
                </Button>
              </div>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 className="text-base font-semibold">Resumo da emissão</h2>
              <p className="mt-1 text-sm text-text-muted">Confirme o comerciante, a taxa e o valor.</p>
            </div>
            <div className="p-5 sm:p-6">
              {merchant ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary-soft p-2.5 text-primary"><Store size={19} /></div>
                    <div className="min-w-0"><p className="truncate font-semibold">{merchant.name}</p><p className="text-sm text-text-muted">{merchant.market}</p></div>
                  </div>
                  <div className="space-y-3 border-t border-border pt-4 text-sm">
                    <SummaryRow label="Banca" value={merchant.stall} />
                    <SummaryRow label="Actividade" value={merchant.product} />
                    <SummaryRow label="Periodicidade" value={merchant.periodicity} />
                    <SummaryRow label="Taxa activa" value={rate} emphasized />
                    <SummaryRow label="Método" value={method || "Por seleccionar"} />
                  </div>
                  <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-text-muted">A senha fica pendente até o fiscal registar o pagamento e a gestão financeira o confirmar.</p>
                </div>
              ) : (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-border px-5 text-center">
                  <Store size={20} className="text-text-muted" />
                  <p className="mt-3 text-sm font-medium">Aguardando selecção</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">Escolha um comerciante para consultar os dados da taxa e da emissão.</p>
                </div>
              )}
            </div>
          </Card>
        </form>
      )}
    </div>
  );
}

function SummaryRow({ label, value, emphasized = false }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      <span className={`text-right ${emphasized ? "font-semibold text-primary" : "font-medium text-text"}`}>{value || "—"}</span>
    </div>
  );
}

function Row({ label, value }) {
  return <div className="flex justify-between gap-4 border-b border-border py-2"><span className="text-text-muted">{label}</span><span className="text-right font-medium">{value}</span></div>;
}
